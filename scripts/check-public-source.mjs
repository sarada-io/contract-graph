/**
 * @file Reject private records and obvious sensitive material in candidate public files.
 * @see ../src/runtime/distribution/.agent/contract.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const credentialPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|npm_[A-Za-z0-9]{30,})\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/,
];

export function checkPublicSource(root = repository) {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const errors = [];
  for (const relative of [...new Set(files)]) {
    const name = relative.split(path.sep).join('/');
    const parts = name.split('/');
    const base = parts.at(-1);
    const authoredTemplate = name === 'src/install/templates/module/.agents/cg/contract.yaml';
    if (parts.includes('.agents') && !authoredTemplate || parts.includes('.wrangler') ||
        /^(?:\.env(?:\..*)?|\.dev\.vars.*|\.npmrc|id_rsa|id_ed25519)$/.test(base) && !['.env.example', '.dev.vars.example'].includes(base) ||
        /\.(?:pem|key|p12|pfx)$/.test(base) ||
        name.startsWith('web/public/') || name.startsWith('docs/plan/') && name !== 'docs/plan/windows-launcher.md') {
      errors.push(`${name}: private or generated file must not be published`);
      continue;
    }
    const file = path.join(root, relative);
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.subarray(0, 4096).includes(0)) continue;
    const text = bytes.toString('utf8');
    if (/(?:\/(?:Users|Volumes)\/[A-Za-z0-9._-]+\/|[A-Z]:\\Users\\[A-Za-z0-9._-]+\\)/.test(text)) errors.push(`${name}: local-machine path must be removed`);
    if (credentialPatterns.some(pattern => pattern.test(text))) errors.push(`${name}: possible credential (value redacted)`);
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkPublicSource();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Candidate public files pass private-record, path and basic credential checks. Run Gitleaks for broader credential detection.');
}
