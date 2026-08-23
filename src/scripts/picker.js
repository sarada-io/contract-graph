/** Dependency-free keyboard multi-select used by `cg init`. */

import readline from "node:readline";

/** Apply one navigation/toggle key to a picker state without touching terminal I/O. */
export function updatePickerState(state, key, itemCount) {
  if (key === "up") {
    return { ...state, cursor: (state.cursor - 1 + itemCount) % itemCount };
  }
  if (key === "down") {
    return { ...state, cursor: (state.cursor + 1) % itemCount };
  }
  if (key !== "space" || state.locked.has(state.cursor)) return state;

  const selected = new Set(state.selected);
  if (selected.has(state.cursor)) selected.delete(state.cursor);
  else selected.add(state.cursor);
  return { ...state, selected };
}

/**
 * Render an interactive checklist. Already-installed rows are selected and locked: re-running
 * init adds support without silently removing a harness that still owns generated discovery files.
 */
export function multiSelect(
  items,
  {
    selectedValues = [],
    lockedValues = [],
    title = "Select supported IDEs and agent harnesses",
    input = process.stdin,
    output = process.stdout,
  } = {},
) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("keyboard selection requires an interactive terminal");
  }
  if (!items.length) throw new Error("keyboard selection requires at least one item");

  const selectedNames = new Set(selectedValues);
  const lockedNames = new Set(lockedValues);
  let state = {
    cursor: Math.max(0, items.findIndex((item) => !lockedNames.has(item.value))),
    selected: new Set(items.flatMap((item, index) => selectedNames.has(item.value) ? [index] : [])),
    locked: new Set(items.flatMap((item, index) => lockedNames.has(item.value) ? [index] : [])),
  };
  for (const index of state.locked) state.selected.add(index);

  readline.emitKeypressEvents(input);
  const wasRaw = Boolean(input.isRaw);
  let drawnLines = 0;
  let message = "";

  const render = () => {
    if (drawnLines) output.write(`\x1b[${drawnLines}A`);
    const lines = [
      title,
      "  ↑/↓ move · Space select · Enter continue",
      ...items.map((item, index) => {
        const active = index === state.cursor ? ">" : " ";
        const checked = state.selected.has(index) ? "x" : " ";
        const suffix = state.locked.has(index) ? " (already installed)" : "";
        return `${active} [${checked}] ${item.label}${suffix}`;
      }),
      message,
    ];
    for (const line of lines) output.write(`\x1b[2K${line}\n`);
    drawnLines = lines.length;
  };

  input.setRawMode(true);
  input.resume();
  output.write("\x1b[?25l");
  render();

  return new Promise((resolve, reject) => {
    const finish = (error) => {
      input.off("keypress", onKeypress);
      input.setRawMode(wasRaw);
      input.pause();
      output.write("\x1b[?25h");
      if (error) reject(error);
      else resolve(items.filter((_, index) => state.selected.has(index)).map((item) => item.value));
    };

    const onKeypress = (text, key = {}) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("profile selection cancelled"));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        if (!state.selected.size) {
          message = "  Select at least one option.";
          output.write("\x07");
          render();
          return;
        }
        finish();
        return;
      }
      const normalized = text === " " ? "space" : key.name;
      if (!["up", "down", "space"].includes(normalized)) return;
      state = updatePickerState(state, normalized, items.length);
      message = "";
      render();
    };

    input.on("keypress", onKeypress);
  });
}
