/** Internal dispatch: every adapter declares its own supported syntax and evidence limits. */
import { adapter as javascript, inspectSource, supportedFile } from "./javascript.js";
import { adapters as native, inspectNative, languageForFile } from "./native-languages.js";
export const adapters = Object.freeze([javascript, ...native]);
export function selectAdapter(file) {
  if (supportedFile.test(file) && !/\.d\.(?:ts|mts)$/i.test(file)) return { ...javascript, language: "javascript-typescript", inspect: text => inspectSource(file, text) };
  const language = languageForFile(file);
  if (!language) return null;
  return { ...native.find(a => a.id === language), language, inspect: text => inspectNative(file, text, language) };
}
