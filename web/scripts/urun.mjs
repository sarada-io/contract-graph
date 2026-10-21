#!/usr/bin/env node
/**
 * @file Urun for the website target.
 * @see .agent/contract.md
 */
/** contractgraph.dev's repository menu. Not a generic task runner or configuration format. */
import { spawnSync } from 'node:child_process';
import { repositoryRoot, SITE_NAME, LIVE_URL, DEV_PORT } from './paths.mjs';
import { startLocalServer, openUrl } from './preview/server.mjs';
import { checkSiteFiles } from './maintenance/assets.mjs';
export { repositoryRoot, SITE_NAME, LIVE_URL, DEV_PORT, getPublicRoot } from './paths.mjs';
export { resolvePublicFile, handleStaticRequest, createStaticServer, openUrl, startLocalServer } from './preview/server.mjs';
export { getRequiredPaths, checkSiteFiles } from './maintenance/assets.mjs';
import { buildSite } from '../site/publication.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ESC = '\x1b';

export function getMoreItems() {
  return [
    { label: 'Check Site Files', detail: 'Confirm the generated pages, schemas, and Wrangler config.', kind: 'check' },
    { label: 'Rebuild Public Schemas', detail: 'Generate both schema URL families from the canonical repository definitions.', kind: 'schemas' },
    { label: 'Open the Live Site', detail: `Open ${LIVE_URL} in your browser. Nothing is published.`, kind: 'live' },
    { label: 'Check Development Environment', detail: 'Show Node and Git versions used for local preview.', kind: 'doctor' },
    { label: 'How This Site Deploys', detail: 'Print the merge-to-main Cloudflare path. Nothing is published.', kind: 'deploy' },
    { label: 'Clean Generated Files', detail: 'Delete .wrangler/ local Cloudflare state. You will be asked before deletion.', kind: 'clean' },
    { label: 'Back', detail: 'Return to the main menu.', kind: 'back' },
  ];
}

export function getMenuItems() {
  return [
    { label: 'Clean & Build', detail: 'Delete .wrangler/, assemble public/ from site/, then check the generated files.', kind: 'clean-build' },
    { label: 'Run Local Server', detail: `Serve public/ at http://localhost:${DEV_PORT} with Node. Ctrl+C stops the server.`, kind: 'serve' },
    { label: 'More', detail: 'File checks, schema generation, live URL, environment checks, deploy reminder, and cleaning generated files.', kind: 'more' },
    { label: 'Exit', detail: 'Return to your terminal.', kind: 'exit' },
  ];
}

export function listMenuLines() {
  const lines = [];
  for (const item of getMenuItems()) {
    lines.push(item.label);
    if (item.kind === 'more') {
      for (const child of getMoreItems()) {
        if (child.kind === 'back') continue;
        lines.push(`  ${child.label}`);
      }
    }
  }
  return lines;
}

export function nextSelection(index, count, key) {
  switch (key) {
    case 'up': return (index + count - 1) % count;
    case 'down': return (index + 1) % count;
    case 'home': return 0;
    case 'end': return count - 1;
    default: return index;
  }
}

export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function listUsageLines() {
  return [
    'Commands:',
    '  ./urun                    Interactive arrow-key menu',
    '  ./urun serve [--port N]   Build and serve public/ without the menu',
    '  ./urun build              Generate public/ from site/',
    '  ./urun check              Check generated output is current',
    '  ./urun --help             List commands and menu items',
  ];
}

export function printHelp(out = process.stdout) {
  out.write(`${SITE_NAME} - repository menu\n`);
  for (const line of listUsageLines()) out.write(`${line}\n`);
  out.write('\nMenu:\n');
  for (const line of listMenuLines()) out.write(`  ${line}\n`);
}

export function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length === 1 && ['build', 'check'].includes(argv[0])) return { command: argv[0] };
  let help = false;
  let serve = false;
  let port = Number.parseInt(process.env.PORT || String(DEV_PORT), 10);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h' || arg === 'help') {
      help = true;
      continue;
    }
    if (arg === '--serve' || arg === 'serve') {
      serve = true;
      continue;
    }
    if (arg === '--port') {
      port = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (arg && !arg.startsWith('-') && /^\d+$/.test(arg)) {
      port = Number.parseInt(arg, 10);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\nRun ./urun --help to list commands.`);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('port must be a number between 1 and 65535.');
  }
  return { help, serve, port };
}

function resolveCommand(command) {
  return command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command;
}

export function invokeRepoCommand(command, args, root = repositoryRoot) {
  const executable = resolveCommand(command);
  process.stdout.write(`\n\x1b[36m> ${command} ${args.join(' ')}\x1b[0m\n\n`);
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error(`Missing ${executable}. Install Node.js 18.17 or newer.`);
    }
    throw result.error;
  }
  return result.status ?? 1;
}

function parseKey(buffer) {
  if (!buffer.length) return 'other';
  if (buffer[0] === 3) return 'ctrl-c';
  if (buffer[0] === 13 || buffer[0] === 10) return 'enter';
  if (buffer[0] !== 27) return buffer.length === 1 ? buffer.toString() : 'other';
  if (buffer.length === 1) return 'escape';
  const seq = buffer.toString();
  if (seq === '\x1b[A' || seq === '\x1bOA') return 'up';
  if (seq === '\x1b[B' || seq === '\x1bOB') return 'down';
  if (seq === '\x1b[H' || seq === '\x1b[1~' || seq === '\x1bOH') return 'home';
  if (seq === '\x1b[F' || seq === '\x1b[4~' || seq === '\x1bOF') return 'end';
  return 'escape';
}

function readKey() {
  return new Promise(resolve => {
    const onData = chunk => {
      process.stdin.removeListener('data', onData);
      resolve(parseKey(Buffer.from(chunk)));
    };
    process.stdin.once('data', onData);
  });
}

async function withRawInput(fn) {
  if (!isInteractive()) {
    throw new Error('The arrow-key menu needs an interactive terminal. Run ./urun (macOS) or urun.cmd (Windows) in your terminal.');
  }
  const previousRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  try {
    return await fn();
  } finally {
    process.stdin.setRawMode(Boolean(previousRaw));
    process.stdin.pause();
  }
}

export async function readMenuChoice(title, items) {
  return withRawInput(async () => {
    process.stdout.write(`${ESC}[?1049h${ESC}[?25l`);
    let selected = 0;
    try {
      while (true) {
        const width = Math.max(20, (process.stdout.columns || 80) - 4);
        process.stdout.write(`${ESC}[H${ESC}[2J\n  ${ESC}[1;36m${title}${ESC}[0m\n\n`);
        for (let i = 0; i < items.length; i++) {
          let label = String(items[i].label);
          if (label.length > width) label = `${label.slice(0, width - 3)}...`;
          process.stdout.write(i === selected ? `  ${ESC}[7m > ${label} ${ESC}[0m\n` : `     ${label}\n`);
        }
        process.stdout.write(`\n  ${items[selected].detail}\n\n  Up/Down: choose    Enter: run    Esc: back/exit\n`);
        const key = await readKey();
        if (key === 'escape' || key === 'ctrl-c') return -1;
        if (key === 'enter') return selected;
        selected = nextSelection(selected, items.length, key);
      }
    } finally {
      process.stdout.write(`${ESC}[0m${ESC}[?25h${ESC}[?1049l`);
    }
  });
}

export async function invokeMenuItem(item, hooks = {}) {
  const run = hooks.invokeRepoCommand ?? invokeRepoCommand;
  const choose = hooks.readMenuChoice ?? readMenuChoice;
  const exists = hooks.exists ?? (target => fs.existsSync(target));
  const remove = hooks.remove ?? (target => fs.rmSync(target, { recursive: true, force: true }));
  const serve = hooks.startLocalServer ?? startLocalServer;
  const check = hooks.checkSiteFiles ?? checkSiteFiles;
  const build = hooks.buildSite ?? buildSite;
  const open = hooks.openUrl ?? openUrl;
  const wranglerDir = path.join(repositoryRoot, '.wrangler');

  switch (item.kind) {
    case 'clean-build': {
      if (exists(wranglerDir)) remove(wranglerDir);
      build();
      return check();
    }
    case 'serve':
      return serve();
    case 'check':
      return check();
    case 'clean': {
      const choice = await choose('Delete Generated Files?', [
        { label: 'Keep Files and Go Back', detail: 'Nothing will be deleted.' },
        { label: 'Delete .wrangler', detail: 'Removes local Cloudflare Wrangler state only.' },
      ]);
      if (choice !== 1) return null;
      if (exists(wranglerDir)) remove(wranglerDir);
      else process.stdout.write('Nothing to delete. .wrangler/ is already absent.\n');
      return 0;
    }
    case 'schemas':
      build();
      return check();
    case 'live':
      open(LIVE_URL);
      process.stdout.write(`Opening ${LIVE_URL}\n`);
      return 0;
    case 'doctor':
      for (const command of [
        { name: 'node', args: ['--version'] },
        { name: 'git', args: ['--version'] },
        { name: 'git', args: ['status', '-sb'] },
      ]) {
        const status = run(command.name, command.args);
        if (status !== 0) return status;
      }
      return 0;
    case 'deploy':
      process.stdout.write(`
The combined repository requires the authorised Cloudflare cutover in DEPLOY.md.
Live URL: ${LIVE_URL}
Review locally; hosted previews remain disabled.
Only public/ is uploaded. See DEPLOY.md.

`);
      return 0;
    case 'more': {
      const outcome = await runMoreMenu(hooks);
      if (outcome.exit) return outcome.status ?? 0;
      return outcome.status;
    }
    default:
      throw new Error('Unknown menu activity.');
  }
}

export async function pauseAfterCommand(status, destination = 'the menu') {
  process.stdout.write(status === 0 ? '\n\x1b[32mDone.\x1b[0m\n' : `\n\x1b[31mCommand failed (exit ${status}).\x1b[0m\n`);
  process.stdout.write(`Press Enter to return to ${destination}, or Esc to exit.\n`);
  return withRawInput(async () => {
    while (true) {
      const key = await readKey();
      if (key === 'escape' || key === 'ctrl-c') return 'exit';
      if (key === 'enter') return 'menu';
    }
  });
}

export async function runMoreMenu(hooks = {}) {
  const choose = hooks.readMenuChoice ?? readMenuChoice;
  const pause = hooks.pauseAfterCommand ?? pauseAfterCommand;
  let lastStatus = null;
  while (true) {
    const extras = getMoreItems();
    const choice = await choose('More', extras);
    if (choice < 0 || extras[choice].kind === 'back') return { status: lastStatus, exit: false };
    try {
      const result = await invokeMenuItem(extras[choice], hooks);
      if (result == null) continue;
      lastStatus = result;
    } catch (error) {
      process.stdout.write(`\x1b[31m${error.message}\x1b[0m\n`);
      lastStatus = 1;
    }
    const resume = await pause(lastStatus, 'More');
    if (resume === 'exit') return { status: lastStatus, exit: true };
  }
}

export async function startRepositoryMenu(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.command) {
    const result = buildSite({ check: options.command === 'check' });
    process.stdout.write(`Site ${options.command === 'check' ? 'checked' : 'built'}: ${result.files} files.\n`);
    return 0;
  }
  if (options.help) {
    printHelp();
    return 0;
  }
  if (options.serve) return startLocalServer({ port: options.port, open: isInteractive() });
  if (!isInteractive()) {
    printHelp();
    process.stderr.write('Open an interactive terminal and run ./urun to select with arrow keys, or run ./urun serve to preview without a menu. Nothing was executed.\n');
    return 1;
  }
  let lastStatus = 0;
  while (true) {
    const menu = getMenuItems();
    const choice = await readMenuChoice(SITE_NAME, menu);
    if (choice < 0 || menu[choice].kind === 'exit') return lastStatus;
    if (menu[choice].kind === 'more') {
      const outcome = await runMoreMenu();
      if (outcome.exit) return outcome.status ?? lastStatus;
      if (outcome.status != null) lastStatus = outcome.status;
      continue;
    }
    try {
      const result = await invokeMenuItem(menu[choice]);
      if (result == null) continue;
      lastStatus = result;
    } catch (error) {
      process.stdout.write(`\x1b[31m${error.message}\x1b[0m\n`);
      lastStatus = 1;
    }
    const resume = await pauseAfterCommand(lastStatus);
    if (resume === 'exit') return lastStatus;
  }
}

function isMain() {
  const entry = process.argv[1];
  return Boolean(entry) && pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isMain()) {
  startRepositoryMenu().then(code => process.exit(code), error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
