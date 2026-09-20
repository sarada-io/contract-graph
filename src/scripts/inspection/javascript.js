/** Syntax observations only. No project loader, emit, application evaluation or plugins. */
import ts from "typescript";

export const adapter = Object.freeze({ id: "javascript-typescript-esm", version: "1", parser: "typescript", parserVersion: ts.version });
export const supportedFile = /\.(?:mjs|js|jsx|ts|mts|tsx)$/i;

export function inspectSource(file, text) {
  const kind = /\.tsx$/i.test(file) ? ts.ScriptKind.TSX : /\.jsx$/i.test(file) ? ts.ScriptKind.JSX
    : /\.(?:ts|mts)$/i.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const facts = [];
  const diagnostics = [];
  const location = node => {
    const start = source.getLineAndCharacterOfPosition(node.getStart(source));
    const end = source.getLineAndCharacterOfPosition(node.end);
    return { start: { line: start.line + 1, column: start.character + 1 }, end: { line: end.line + 1, column: end.character + 1 } };
  };
  const issue = (code, node, message) => diagnostics.push({ code, message, range: location(node) });
  if (source.parseDiagnostics.length) {
    return { facts, diagnostics: source.parseDiagnostics.map(d => ({ code: "parse-error", message: ts.flattenDiagnosticMessageText(d.messageText, " "), offset: d.start })), coverage: "failed" };
  }
  const has = (node, modifier) => node.modifiers?.some(m => m.kind === modifier);
  const names = name => ts.isIdentifier(name) ? [name.text] : (name.elements ?? []).flatMap(e => ts.isOmittedExpression(e) ? [] : names(e.name));
  const bindings = new Set();
  for (const node of source.statements) {
    if (ts.isVariableStatement(node)) node.declarationList.declarations.forEach(d => names(d.name).forEach(n => bindings.add(n)));
    else if (node.name && ts.isIdentifier(node.name)) bindings.add(node.name.text);
    else if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.name) bindings.add(clause.name.text);
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) bindings.add(clause.namedBindings.name.text);
        else clause.namedBindings.elements.forEach(e => bindings.add(e.name.text));
      }
    }
  }
  const fact = (node, data) => facts.push({ ...data, range: location(node) });
  const dependency = (node, specifier, mode, dependencyKind, imported = []) => fact(node, { category: "dependency", specifier, mode, dependencyKind, imported });
  const exported = (node, name, local, exportKind, extra = {}) => fact(node, { category: "export", name, local, exportKind, ...extra });
  for (const node of source.statements) {
    if (ts.isImportDeclaration(node)) {
      const c = node.importClause;
      const imported = [];
      if (c?.name) imported.push({ name: "default", local: c.name.text, typeOnly: !!c.isTypeOnly });
      if (c?.namedBindings) {
        if (ts.isNamespaceImport(c.namedBindings)) imported.push({ name: "*", local: c.namedBindings.name.text, typeOnly: !!c.isTypeOnly });
        else for (const e of c.namedBindings.elements) imported.push({ name: (e.propertyName ?? e.name).text, local: e.name.text, typeOnly: !!(c.isTypeOnly || e.isTypeOnly) });
      }
      const mode = imported.length && imported.every(i => i.typeOnly) ? "type" : imported.some(i => i.typeOnly) ? "mixed" : "runtime";
      dependency(node, node.moduleSpecifier.text, mode, c ? "static" : "side-effect", imported);
    } else if (ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier?.text;
      const clause = node.exportClause;
      const elements = clause && ts.isNamedExports(clause) ? clause.elements : [];
      const mode = node.isTypeOnly || (elements.length && elements.every(e => e.isTypeOnly)) ? "type" : elements.some(e => e.isTypeOnly) ? "mixed" : "runtime";
      if (specifier !== undefined) dependency(node, specifier, mode, "re-export");
      if (!clause) {
        issue("wildcard-export", node, "Wildcard export set is not expanded.");
      } else if (ts.isNamespaceExport(clause)) {
        exported(clause, clause.name.text, null, "namespace-re-export", { specifier, typeOnly: !!node.isTypeOnly, binding: "unresolved" });
      } else {
        for (const e of clause.elements) {
          const local = (e.propertyName ?? e.name).text;
          const binding = specifier !== undefined ? "unresolved" : bindings.has(local) ? "declared" : "unresolved";
          exported(e, e.name.text, local, specifier !== undefined ? "re-export" : "named", { typeOnly: !!(node.isTypeOnly || e.isTypeOnly), binding, ...(specifier !== undefined ? { specifier } : {}) });
          if (binding === "unresolved") issue("unresolved-export-binding", e, "Export name is explicit; binding availability is not established.");
        }
      }
    } else if (ts.isExportAssignment(node)) {
      if (node.isExportEquals) issue("unsupported-commonjs", node, "TypeScript export-equals is outside ESM extraction.");
      else exported(node, "default", ts.isIdentifier(node.expression) ? node.expression.text : null, "default", { binding: ts.isIdentifier(node.expression) && !bindings.has(node.expression.text) ? "unresolved" : "declared" });
    } else if (has(node, ts.SyntaxKind.ExportKeyword)) {
      if (has(node, ts.SyntaxKind.DeclareKeyword) || ts.isModuleDeclaration(node)) {
        issue("unsupported-ambient-export", node, "Ambient/namespace exports require additional analysis.");
      } else if (has(node, ts.SyntaxKind.DefaultKeyword)) {
        exported(node, "default", node.name?.text ?? null, "default", { binding: "declared" });
      } else if (ts.isVariableStatement(node)) {
        for (const d of node.declarationList.declarations) for (const n of names(d.name)) exported(d, n, n, "declaration", { binding: "declared" });
      } else if (node.name && ts.isIdentifier(node.name)) {
        exported(node, node.name.text, node.name.text, "declaration", { typeOnly: ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node), binding: "declared" });
      } else issue("unsupported-export", node, "Export form is outside the supported declaration subset.");
    }
    if (ts.isImportEqualsDeclaration(node)) issue("unsupported-import-equals", node, "TypeScript import-equals is not resolved.");
  }
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) dependency(node, arg.text, "runtime", "dynamic");
      else issue("computed-import", node, "Dynamic import target is not a string literal.");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      issue("unsupported-require", node, "require call observed; binding and CommonJS semantics are not established.");
    }
    if ((ts.isIdentifier(node) && ["exports", "module"].includes(node.text)) &&
        ((ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent)) && node.parent.expression === node)) {
      issue("unsupported-commonjs", node.parent, "Possible CommonJS access; ESM export completeness is not established.");
    }
    if (ts.isImportTypeNode(node)) issue("unsupported-import-type", node, "TypeScript import type expression is not resolved.");
    ts.forEachChild(node, visit);
  };
  visit(source);
  const exportNames = facts.filter(f => f.category === "export").map(f => f.name);
  if (new Set(exportNames).size !== exportNames.length) diagnostics.push({ code: "repeated-export-name", message: "Repeated export names require semantic analysis; no complete symbol set is proposed." });
  if (facts.some(f => f.category === "export" && f.binding === "unresolved") && !diagnostics.some(d => d.code === "unresolved-export-binding")) {
    diagnostics.push({ code: "unresolved-export-binding", message: "An export binding is not established." });
  }
  return { facts, diagnostics, coverage: diagnostics.length ? "partial" : "complete-for-supported-syntax" };
}
