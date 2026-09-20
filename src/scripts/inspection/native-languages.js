/** Portable syntax-only adapters. Parsers are installed CG assets, never adopter plugins. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { Parser, Language } from "web-tree-sitter";
import { inspectDart } from "./dart.js";

const require = createRequire(import.meta.url);
const runtimeVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve("web-tree-sitter")), "package.json"), "utf8")).version;
const grammarVersion = JSON.parse(fs.readFileSync(require.resolve("tree-sitter-wasms/package.json"), "utf8")).version;
const specs = { java: /\.java$/i, kotlin: /\.kts?$/i, python: /\.py$/i, go: /\.go$/i, c_sharp: /\.cs$/i, dart: /\.dart$/i };
await Parser.init();
const grammars = new Map();
export const adapters = await Promise.all(Object.keys(specs).map(async language => {
  if (language === "dart") {
    const metadata = JSON.parse(fs.readFileSync(new URL("./grammars/dart.json", import.meta.url), "utf8"));
    const bytes = fs.readFileSync(new URL("./grammars/dart.wasm", import.meta.url));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== metadata.grammarSha256) throw new Error("Dart grammar integrity mismatch");
    grammars.set(language, await Language.load(bytes));
    return Object.freeze({ id: language, version: "1", parser: "web-tree-sitter", parserVersion: runtimeVersion, ...metadata });
  }
  const file = require.resolve(`tree-sitter-wasms/out/tree-sitter-${language}.wasm`);
  const bytes = fs.readFileSync(file);
  grammars.set(language, await Language.load(bytes));
  return Object.freeze({ id: language, version: "1", parser: "web-tree-sitter", parserVersion: runtimeVersion, grammarPackage: "tree-sitter-wasms", grammarVersion, grammarSha256: crypto.createHash("sha256").update(bytes).digest("hex") });
}));
export const languageForFile = file => Object.keys(specs).find(language => specs[language].test(file)) ?? null;
const children = (node, type) => node.namedChildren.filter(n => n.type === type);
const first = (node, type) => node.namedChildren.find(n => n.type === type);
const field = (node, name) => node.childForFieldName(name);
const named = node => field(node, "name") ?? first(node, "simple_identifier") ?? first(node, "type_identifier") ?? first(node, "identifier");
const fullName = (prefix, name) => prefix ? `${prefix}.${name}` : name;
const walk = (node, fn) => { fn(node); for (const child of node.namedChildren) walk(child, fn); };
const modifiers = node => node.namedChildren.filter(n => ["modifier", "modifiers"].includes(n.type)).flatMap(n => n.text.split(/\s+/));
// Decoding a literal only after the language parser identified its syntax node is not source scanning.
function simpleString(node) {
  if (!node) return null;
  const text = node.text;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")) || (text.startsWith("`") && text.endsWith("`"))) {
    const body = text.slice(1, -1);
    if (!/[\\\r\n]/.test(body) && !body.includes(text[0])) return body;
  }
  return null;
}

export function inspectNative(file, text, language = languageForFile(file)) {
  const parser = new Parser();
  parser.setLanguage(grammars.get(language));
  let progressSteps = 0;
  let tree;
  const facts = [];
  const diagnostics = [];
  const range = node => ({ start: { line: node.startPosition.row + 1, column: node.startPosition.column + 1 }, end: { line: node.endPosition.row + 1, column: node.endPosition.column + 1 } });
  const issue = (code, node, message) => diagnostics.push({ code, message, ...(node ? { range: range(node) } : {}) });
  let namespace = null;
  const fact = (node, data) => facts.push({ ...data, language, namespace, range: range(node) });
  const symbol = (node, name, exportKind = "declaration", extra = {}) => fact(node, { category: "export", name, local: name, exportKind, binding: "declared", visibility: "public", ...extra });
  const dependency = (node, specifier, extra = {}) => fact(node, { category: "dependency", specifier, mode: "language-import", dependencyKind: "static", imported: [], ...extra });
  const isPublic = (node, implicit = false) => {
    const mods = modifiers(node);
    return !mods.some(m => ["private", "protected", "internal", "file"].includes(m)) && (implicit || mods.includes("public"));
  };
  try {
    tree = parser.parse(text, null, { progressCallback: () => ++progressSteps > 2000 });
    if (!tree) return { facts, diagnostics: [{ code: "parse-limit", message: "Parser stopped before producing a tree." }], coverage: "failed" };
    const root = tree.rootNode;
    if (root.hasError) {
      const errors = node => {
        if (diagnostics.length >= 20) return;
        if (node.isError || node.isMissing) issue("parse-error", node, `Unsupported or invalid ${language} syntax (${node.type}).`);
        else for (const child of node.children) if (child.hasError || child.isMissing || child.isError) errors(child);
      };
      errors(root);
      if (!diagnostics.length) issue("parse-error", root, `Unsupported or invalid ${language} syntax.`);
      return { facts: [], diagnostics: diagnostics.slice(0, 20), coverage: "failed" };
    }
    // These transforms cannot be inferred from declarations, even when syntax is valid.
    walk(root, n => {
      if (/^(?:preproc_|preprocessor_)/.test(n.type)) issue("conditional-compilation", n, "Build/preprocessor conditions are not evaluated.");
      if (language === "c_sharp" && ["if_directive", "elif_directive", "else_directive", "endif_directive", "define_directive", "undef_directive"].includes(n.type)) issue("conditional-compilation", n, "C# preprocessor conditions are not evaluated.");
      if (["annotation", "marker_annotation", "attribute_list"].includes(n.type)) issue("annotations-not-expanded", n, "Attributes/annotations and generated APIs are not expanded.");
    });
    if (language === "dart") {
      inspectDart(root, { file, fact, symbol, dependency, issue });
    } else if (language === "java") {
      const pkg = first(root, "package_declaration");
      namespace = pkg?.namedChildren.find(n => ["identifier", "scoped_identifier"].includes(n.type))?.text ?? null;
      for (const imp of children(root, "import_declaration")) {
        const target = imp.namedChildren.find(n => ["identifier", "scoped_identifier"].includes(n.type));
        dependency(imp, target?.text ?? imp.text, { wildcard: !!first(imp, "asterisk"), static: imp.children.some(n => n.type === "static") });
      }
      const types = new Set(["class_declaration", "interface_declaration", "enum_declaration", "record_declaration", "annotation_type_declaration"]);
      const visit = (node, prefix = "", implicit = false) => {
        if (!isPublic(node, implicit)) return;
        const name = named(node)?.text;
        if (types.has(node.type)) {
          if (!name) { issue("unnamed-declaration", node, "Type name is unresolved."); return; }
          const qualified = fullName(prefix, name);
          symbol(node, qualified, "type");
          if (["enum_declaration", "record_declaration", "annotation_type_declaration"].includes(node.type)) issue("generated-members", node, "Generated/implicit type members are not enumerated.");
          if (node.namedChildren.some(n => ["superclass", "super_interfaces", "extends_interfaces"].includes(n.type))) issue("inherited-members", node, "Inherited API is not enumerated.");
          const body = field(node, "body");
          for (const member of body?.namedChildren ?? []) {
            if (member.type === "enum_constant") symbol(member, fullName(qualified, named(member)?.text), "enum-member");
            else if (member.type === "enum_body_declarations") for (const declaration of member.namedChildren) visit(declaration, qualified);
            else visit(member, qualified, node.type === "interface_declaration");
          }
        } else if (["method_declaration", "constructor_declaration", "annotation_type_element_declaration"].includes(node.type) && name) symbol(node, fullName(prefix, name), node.type === "constructor_declaration" ? "constructor" : "member");
        else if (["field_declaration", "constant_declaration"].includes(node.type)) for (const variable of children(node, "variable_declarator")) symbol(variable, fullName(prefix, named(variable)?.text), "field");
      };
      for (const node of root.namedChildren) if (types.has(node.type)) visit(node);
      if (first(root, "module_declaration")) issue("module-exports-unresolved", root, "Java module export directives require build-aware interpretation.");
    } else if (language === "kotlin") {
      namespace = first(first(root, "package_header") ?? root, "identifier")?.text ?? null;
      for (const list of children(root, "import_list")) for (const imp of children(list, "import_header")) {
        dependency(imp, first(imp, "identifier")?.text ?? imp.text, { alias: first(imp, "import_alias")?.namedChildren[0]?.text ?? null, wildcard: imp.children.some(n => n.type === "*") });
      }
      const visit = (node, prefix = "") => {
        if (!isPublic(node, true)) return;
        const mods = modifiers(node);
        if (mods.includes("override") && !mods.includes("public")) { issue("override-visibility", node, "Implicit override visibility requires inherited context."); return; }
        if (mods.some(m => ["data", "expect", "actual", "enum"].includes(m))) issue("generated-or-platform-members", node, "Generated and multiplatform APIs are not expanded.");
        if (["class_declaration", "object_declaration", "companion_object"].includes(node.type)) {
          const name = named(node)?.text ?? (node.type === "companion_object" ? "Companion" : null);
          if (!name) { issue("unnamed-declaration", node, "Type name is unresolved."); return; }
          const qualified = fullName(prefix, name); symbol(node, qualified, "type");
          if (first(node, "delegation_specifier") || first(node, "delegation_specifiers")) issue("inherited-members", node, "Inherited/delegated API is not enumerated.");
          const constructor = first(node, "primary_constructor");
          for (const parameter of constructor?.namedChildren ?? []) {
            if (parameter.type === "class_parameter" && parameter.children.some(n => ["val", "var"].includes(n.type)) && isPublic(parameter, true)) symbol(parameter, fullName(qualified, named(parameter)?.text), "constructor-property");
          }
          for (const member of first(node, "class_body")?.namedChildren ?? []) visit(member, qualified);
        } else if (["function_declaration", "type_alias"].includes(node.type)) {
          const name = named(node)?.text;
          if (name) symbol(node, fullName(prefix, name), node.type === "type_alias" ? "type" : "function");
          else issue("unnamed-declaration", node, "Declaration name is unresolved.");
        } else if (node.type === "property_declaration") {
          const variable = first(node, "variable_declaration");
          if (variable && named(variable)) symbol(variable, fullName(prefix, named(variable).text), "property");
          else issue("destructured-property", node, "Destructured property exports are outside this subset.");
        }
      };
      for (const node of root.namedChildren) visit(node);
      if (/\.kts$/i.test(file)) issue("script-entry-semantics", root, "Kotlin script execution and generated entry APIs are not evaluated.");
    } else if (language === "go") {
      namespace = first(root, "package_clause")?.namedChildren[0]?.text ?? null;
      const publicName = name => /^\p{Lu}/u.test(name ?? "");
      walk(root, node => {
        if (node.type === "import_spec") {
          const specifier = simpleString(field(node, "path"));
          if (specifier === null) issue("escaped-import", node, "Escaped import literal is not decoded.");
          dependency(node, specifier ?? field(node, "path")?.text ?? null, { alias: field(node, "name")?.text ?? null });
        }
        if (node.type === "comment" && /^(?:\/\/go:build|\/\/\s*\+build)/.test(node.text)) issue("build-constraint", node, "Go build constraints are not evaluated.");
      });
      if (/_(?:test|linux|windows|darwin|android|ios|freebsd|openbsd|netbsd|plan9|solaris|aix|amd64|arm64|386|arm)\.go$/i.test(file)) issue("file-build-context", root, "Filename-specific build/test selection is not evaluated.");
      const emit = (node, prefix = "", kind = "declaration") => {
        const name = named(node)?.text;
        if (publicName(name)) symbol(node, fullName(prefix, name), kind);
      };
      for (const node of root.namedChildren) {
        if (node.type === "function_declaration") emit(node, "", "function");
        else if (node.type === "method_declaration") {
          const receiver = field(node, "receiver");
          let type = receiver?.namedChildren[0] && field(receiver.namedChildren[0], "type");
          if (type?.type === "pointer_type") type = type.namedChildren[0];
          if (type?.type === "generic_type") type = field(type, "type");
          if (publicName(type?.text)) emit(node, type.text, "method");
          else if (publicName(named(node)?.text)) issue("receiver-visibility", node, "Exported method on a non-public/unresolved receiver needs API review.");
        } else if (["var_declaration", "const_declaration"].includes(node.type)) {
          for (const spec of node.namedChildren) for (const name of spec.childrenForFieldName("name")) if (publicName(name.text)) symbol(name, name.text, "binding");
        } else if (node.type === "type_declaration") for (const spec of node.namedChildren) {
          const name = named(spec)?.text;
          if (!publicName(name)) continue;
          symbol(spec, name, "type");
          const type = field(spec, "type");
          if (spec.type === "type_alias") issue("alias-members", spec, "Alias target members are not expanded.");
          if (type?.type === "struct_type") for (const body of type.namedChildren) for (const member of body.namedChildren) {
            const names = member.childrenForFieldName("name");
            if (!names.length) issue("embedded-members", member, "Promoted embedded fields/methods are not expanded.");
            for (const n of names) if (publicName(n.text)) symbol(n, `${name}.${n.text}`, "field");
          }
          if (type?.type === "interface_type") for (const member of type.namedChildren) {
            if (member.type === "method_spec") emit(member, name, "method");
            else issue("embedded-members", member, "Embedded interface/type-set members are not expanded.");
          }
        }
      }
      if (namespace === "main") fact(root, { category: "entry", entryKind: "go-main-package", target: file, qualified: true });
    } else if (language === "c_sharp") {
      const types = new Set(["class_declaration", "struct_declaration", "interface_declaration", "enum_declaration", "record_declaration", "delegate_declaration"]);
      const visit = (node, prefix = "", implicit = false) => {
        if (["namespace_declaration", "file_scoped_namespace_declaration"].includes(node.type)) {
          const prior = namespace; namespace = fullName(namespace, named(node)?.text ?? "");
          const body = field(node, "body") ?? node;
          for (const member of body.namedChildren) if (member !== named(node)) visit(member, prefix);
          namespace = prior; return;
        }
        if (node.type === "using_directive") {
          const alias = first(node, "name_equals")?.namedChildren[0]?.text ?? null;
          const target = node.namedChildren.filter(n => n.type !== "name_equals").at(-1);
          dependency(node, target?.text ?? node.text, { alias, static: node.children.some(n => n.type === "static"), global: node.children.some(n => n.type === "global") }); return;
        }
        if (!isPublic(node, implicit)) return;
        const name = named(node)?.text;
        if (types.has(node.type)) {
          if (!name) { issue("unnamed-declaration", node, "Type name is unresolved."); return; }
          const qualified = fullName(prefix, name); symbol(node, qualified, "type");
          if (modifiers(node).includes("partial") || node.type === "record_declaration") issue("partial-or-generated-members", node, "Partial/record generated APIs require build-aware review.");
          if (first(node, "base_list")) issue("inherited-members", node, "Inherited API is not enumerated.");
          for (const member of field(node, "body")?.namedChildren ?? []) {
            if (member.type === "enum_member_declaration") symbol(member, fullName(qualified, named(member)?.text), "enum-member");
            else visit(member, qualified, node.type === "interface_declaration");
          }
        } else if (["method_declaration", "constructor_declaration", "property_declaration", "event_declaration"].includes(node.type) && name) symbol(node, fullName(prefix, name), node.type === "constructor_declaration" ? "constructor" : "member");
        else if (["field_declaration", "event_field_declaration"].includes(node.type)) {
          for (const variable of first(node, "variable_declaration")?.namedChildren ?? []) if (variable.type === "variable_declarator") symbol(variable, fullName(prefix, named(variable)?.text), "field");
        } else if (["operator_declaration", "conversion_operator_declaration", "indexer_declaration"].includes(node.type)) issue("unnamed-member", node, "Operators/indexers require a separately defined symbol convention.");
      };
      for (const node of root.namedChildren) visit(node);
      if (first(root, "global_statement")) {
        issue("generated-entry", root, "C# top-level program entry is compiler-generated and not enumerated.");
        fact(root, { category: "entry", entryKind: "csharp-top-level-program", target: file, qualified: true });
      }
    } else if (language === "python") {
      const bindings = new Map();
      const inspectedImports = new Set();
      let all = null, allWrites = 0;
      const bind = (node, name, kind, extra = {}) => { if (name) bindings.set(name, { node, name, kind, extra }); };
      const imports = (node, bindNames = true) => {
        if (inspectedImports.has(node.startIndex)) return;
        inspectedImports.add(node.startIndex);
        const base = field(node, "module_name")?.text ?? null;
        const names = node.childrenForFieldName("name");
        if (first(node, "wildcard_import")) issue("wildcard-import", node, "Wildcard import bindings are not expanded.");
        if (base) dependency(node, base, { dependencyKind: "from-import", imported: names.map(n => ({ name: field(n, "name")?.text ?? n.text, local: field(n, "alias")?.text ?? n.text })) });
        for (const item of names) {
          const target = field(item, "name")?.text ?? item.text;
          const alias = field(item, "alias")?.text ?? (base ? target : target.split(".")[0]);
          if (!base) dependency(item, target, { alias });
          if (bindNames) bind(item, alias, "import-binding", { binding: "unresolved" });
        }
      };
      const declaration = node => {
        if (node.type === "decorated_definition") {
          issue("decorated-api", node, "Decorators may change declarations; they are not evaluated.");
          const d = field(node, "definition"); if (d) declaration(d); return;
        }
        if (["function_definition", "class_definition"].includes(node.type)) bind(node, named(node)?.text, node.type === "class_definition" ? "type" : "function");
        else if (["import_statement", "import_from_statement"].includes(node.type)) imports(node);
        else if (node.type === "expression_statement") {
          const expr = node.namedChildren[0];
          if (expr?.type === "assignment") {
            const left = field(expr, "left"), right = field(expr, "right");
            if (left?.text === "__all__") {
              allWrites++;
              const literal = right && ["list", "tuple"].includes(right.type) ? right.namedChildren.map(simpleString) : null;
              if (literal && literal.every(s => s !== null) && allWrites === 1) all = literal;
              else { all = null; issue("dynamic-exports", expr, "__all__ is not one literal list/tuple of simple strings."); }
            } else if (left?.type === "identifier") bind(left, left.text, "binding");
            else issue("complex-binding", expr, "Destructured/attribute/chained bindings require further analysis.");
          } else if (expr?.type !== "string") issue("module-execution", node, "Module-level execution may change exports and is not evaluated.");
        } else if (!["comment", "future_import_statement"].includes(node.type)) issue("conditional-declarations", node, "Conditional or unsupported module declarations are not evaluated.");
      };
      for (const node of root.namedChildren) declaration(node);
      // Any mutation/use through these dynamic mechanisms invalidates a complete export-set proposal.
      walk(root, n => {
        if (["import_statement", "import_from_statement"].includes(n.type)) imports(n, false);
        if (n.type === "call" && ["exec", "eval", "globals", "setattr", "__import__"].includes(field(n, "function")?.text)) issue("dynamic-exports", n, "Dynamic namespace/import behavior is not evaluated.");
        if (n.type === "call" && field(n, "function")?.text?.startsWith("__all__.")) issue("dynamic-exports", n, "__all__ mutation is not evaluated.");
        if (n.type === "augmented_assignment" && field(n, "left")?.text === "__all__") issue("dynamic-exports", n, "__all__ mutation is not evaluated.");
      });
      if (bindings.has("__getattr__")) issue("dynamic-exports", bindings.get("__getattr__").node, "Module attribute fallback may expose dynamic names.");
      const members = (node, prefix) => {
        if (field(node, "superclasses")) issue("inherited-members", node, "Inherited/metaclass API is not enumerated.");
        for (const member of field(node, "body")?.namedChildren ?? []) {
          const d = member.type === "decorated_definition" ? field(member, "definition") : member;
          if (member.type === "decorated_definition") issue("decorated-api", member, "Decorated members are not evaluated.");
          if (d && ["function_definition", "class_definition"].includes(d.type)) {
            const name = named(d)?.text;
            if (name && !name.startsWith("_")) {
              symbol(d, `${prefix}.${name}`, d.type === "class_definition" ? "type" : "method", { visibility: "non-underscore-convention" });
              if (d.type === "class_definition") members(d, `${prefix}.${name}`);
            }
          } else if (d?.type === "expression_statement") {
            const expression = d.namedChildren[0];
            if (expression?.type === "assignment" && field(expression, "left")?.type === "identifier") {
              const name = field(expression, "left").text;
              if (!name.startsWith("_")) symbol(expression, `${prefix}.${name}`, "class-binding", { visibility: "non-underscore-convention" });
            } else if (expression?.type !== "string") issue("dynamic-class-members", d, "Class execution may change members and is not evaluated.");
          } else if (d && !["pass_statement", "comment"].includes(d.type)) issue("conditional-members", d, "Conditional class members are not evaluated.");
        }
      };
      for (const name of all ?? [...bindings.keys()].filter(n => !n.startsWith("_"))) {
        const b = bindings.get(name);
        if (!b) { issue("unresolved-export-binding", root, `__all__ names ${JSON.stringify(name)} without a supported local binding.`); continue; }
        symbol(b.node, name, b.kind, { ...b.extra, visibility: all ? "explicit-__all__" : "non-underscore-convention" });
        if (b.kind === "import-binding") issue("unresolved-export-binding", b.node, "Imported binding availability is not established.");
        if (b.kind === "type") members(b.node, name);
      }
      if (all) fact(root, { category: "export-list", names: all, semantics: "__all__ controls star imports, not access control" });
    }
    return { facts, diagnostics, coverage: diagnostics.length ? "partial" : "complete-for-supported-syntax" };
  } catch (error) {
    return { facts: [], diagnostics: [{ code: "parser-error", message: `Parser could not complete: ${error.message}` }], coverage: "failed" };
  } finally { tree?.delete(); parser.delete(); }
}
