/** Dart library syntax, not Flutter runtime/build or transitive API resolution. */
export function inspectDart(root, { file, fact, symbol, dependency, issue }) {
  const first = (n, type) => n.namedChildren.find(c => c.type === type);
  const field = (n, name) => n.childForFieldName(name);
  const identifier = n => field(n, "name") ?? first(n, "identifier");
  const publicName = name => !!name && !name.startsWith("_");
  const emit = (node, name, prefix = "", kind = "declaration") => {
    if (publicName(name)) symbol(node, prefix ? `${prefix}.${name}` : name, kind, { visibility: "dart-library-public" });
  };
  const uri = n => {
    const literal = first(n, "string_literal");
    const text = literal?.text ?? "";
    // Do not silently decode escapes, interpolate, or join adjacent literals.
    const match = /^(?:r)?(['"])([^\r\n]*)\1$/.exec(text);
    if (!match || /[\\$]/.test(match[2]) || match[2].includes(match[1])) {
      issue("unresolved-uri", n, "Dart URI is outside the supported simple literal subset.");
      return null;
    }
    return match[2];
  };
  const directive = node => {
    const wrapper = node.namedChildren[0];
    const isExport = wrapper?.type === "library_export";
    const spec = isExport ? wrapper : wrapper && first(wrapper, "import_specification");
    if (!spec) { issue("unsupported-directive", node, "Dart directive shape is unresolved."); return; }
    const configurable = first(spec, "configurable_uri");
    const combinators = spec.namedChildren.filter(n => n.type === "combinator").map(n => ({
      kind: n.children[0].text, names: n.namedChildren.filter(c => c.type === "identifier").map(c => c.text),
    }));
    const extra = { dependencyKind: isExport ? "reexport" : "static", alias: first(spec, "identifier")?.text ?? null,
      deferred: spec.children.some(n => n.type === "deferred"), combinators };
    for (const node of configurable?.namedChildren ?? spec.namedChildren.filter(n => n.type === "uri")) {
      if (node.type === "uri") dependency(node, uri(node), { ...extra, conditional: false });
      else if (node.type === "configuration_uri") {
        const target = first(node, "uri");
        dependency(node, target ? uri(target) : null, { ...extra, conditional: true, condition: first(node, "configuration_uri_condition")?.text ?? null });
        issue("conditional-library", node, "Dart platform conditions are recorded but not evaluated; no branch is selected.");
      }
    }
    if (isExport) {
      issue("unresolved-reexports", node, "Exported library names and show/hide filters are not expanded.");
      fact(node, { category: "entry", entryKind: "dart-export-library", target: file, qualified: true });
    }
  };
  const types = new Set(["class_definition", "mixin_declaration", "enum_declaration", "extension_declaration", "extension_type_declaration"]);
  const signatures = new Set(["function_signature", "getter_signature", "setter_signature"]);
  const constructors = new Set(["constructor_signature", "constant_constructor_signature", "factory_constructor_signature", "redirecting_factory_constructor_signature"]);
  const ignored = new Set(["comment", "documentation_comment", "function_body", "type_identifier", "type_arguments", "inferred_type", "final_builtin", "const_builtin", "static", "late", "external", "abstract", "covariant", "factory", "const", "final"]);
  const visit = (node, prefix = "") => {
    if (types.has(node.type)) {
      const alias = first(node, "mixin_application_class");
      const name = identifier(alias ?? node)?.text;
      if (!name) {
        issue("unnamed-extension", node, "Unnamed extension members are library-local and not proposed as public symbols."); return;
      }
      if (!publicName(name)) return;
      emit(node, name, "", "type");
      if (alias || node.namedChildren.some(n => ["superclass", "interfaces", "mixins"].includes(n.type)) || (node.type === "mixin_declaration" && node.children.some(n => n.type === "on")))
        issue("inherited-members", node, "Inherited, mixed-in and interface API is not enumerated.");
      if (["enum_declaration", "extension_type_declaration"].includes(node.type)) issue("generated-members", node, "Implicit enum/extension-type members and constructors are not enumerated.");
      if (node.type === "extension_declaration") issue("extension-resolution", node, "Extension applicability requires library/type resolution.");
      const body = field(node, "body") ?? first(node, "class_body");
      for (const member of body?.namedChildren ?? []) visit(member, name);
      return;
    }
    if (["declaration", "method_signature", "initialized_identifier_list", "static_final_declaration_list"].includes(node.type)) {
      for (const child of node.namedChildren) visit(child, prefix);
    } else if (signatures.has(node.type)) {
      const name = identifier(node)?.text;
      emit(node, name, prefix, node.type === "function_signature" ? "function" : "accessor");
      if (!prefix && name === "main" && node.type === "function_signature") fact(node, { category: "entry", entryKind: "dart-main-function", target: file, qualified: true });
    } else if (constructors.has(node.type)) {
      const ids = node.namedChildren.filter(n => n.type === "identifier");
      const name = ids.length > 1 ? ids[1].text : ids[0]?.text;
      emit(node, name, prefix, "constructor");
    } else if (["initialized_identifier", "static_final_declaration", "enum_constant"].includes(node.type)) {
      emit(node, identifier(node)?.text, prefix, node.type === "enum_constant" ? "enum-member" : "binding");
    } else if (node.type === "type_alias") {
      emit(node, first(node, "type_identifier")?.text, prefix, "type");
    } else if (node.type === "annotation") {
      // Already qualified by the shared adapter; never traverse annotation arguments as declarations.
    } else if (!ignored.has(node.type)) {
      issue("unsupported-declaration", node, `Dart ${node.type} is not enumerated as a named public declaration.`);
    }
  };
  for (const node of root.namedChildren) {
    if (node.type === "import_or_export") directive(node);
    else if (["part_directive", "part_of_directive"].includes(node.type)) {
      const target = first(node, "uri");
      dependency(node, target ? uri(target) : first(node, "dotted_identifier_list")?.text ?? null, { dependencyKind: node.type === "part_directive" ? "part" : "part-of" });
      issue("unresolved-library-parts", node, "Parts share library privacy; generated/other parts are not combined into a complete API.");
    } else if (node.type === "library_name") {
      fact(node, { category: "library", name: first(node, "dotted_identifier_list")?.text ?? null });
    } else visit(node);
  }
  if (/\.(?:g|freezed|gr)\.dart$/i.test(file)) issue("generated-source", root, "Generated Dart source is observed as present; generator freshness and origin are not verified.");
}
