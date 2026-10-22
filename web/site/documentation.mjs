/**
 * @file Render canonical repository guides and schema payloads for the website.
 * @see .agent/contract.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { fileURLToPath } from 'node:url';

const defaultWebRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const schemaNames = Object.freeze(['contract', 'principles', 'enforcement']);
export const brandNames = Object.freeze(['contract-graph-mark.webp', 'contract-graph-mark-white.webp']);
const fixedInputs = new Set(['docs/README.md', ...schemaNames.map(name => `src/cg/schema/${name}.schema.json`), ...brandNames.map(name => `docs/assets/${name}`)]);
// A published route predates the canonical filename. New guides need no route entry.
const legacySlugs = new Map([['architecture-considerations', 'architecture']]);

function readCanonical(webRoot, relative) {
  const root = fs.realpathSync(path.dirname(webRoot));
  const file = path.join(root, relative);
  if (fs.realpathSync(file) !== file || !fs.statSync(file).isFile()) throw new Error(`Shared input must be a regular file without symlinks: ${relative}`);
  return fs.readFileSync(file);
}

/** The marked canonical index table is the public opt-in, never a recursive docs scan. */
export function loadGuides(webRoot = defaultWebRoot) {
  const index = readCanonical(webRoot, 'docs/README.md').toString();
  const start = '<!-- public-guides:start -->', end = '<!-- public-guides:end -->';
  if (index.split(start).length !== 2 || index.split(end).length !== 2 || index.indexOf(end) < index.indexOf(start)) throw new Error('Documentation index requires one public-guides table');
  const md = new MarkdownIt();
  const tokens = md.parse(index.split(start)[1].split(end)[0], {});
  if (tokens.filter(token => token.type === 'table_open').length !== 1 || tokens[0]?.type !== 'table_open' || tokens.at(-1)?.type !== 'table_close') throw new Error('Public guides must be one Markdown table');
  const rows = [];
  let cells;
  for (const token of tokens) {
    if (token.type === 'tr_open') cells = [];
    if (token.type === 'inline') cells.push(token);
    if (token.type === 'tr_close') rows.push(cells);
  }
  if (rows[0]?.map(cell => cell.content).join('|') !== 'Read|What it answers' || rows.length < 2) throw new Error('Public guide table requires Read and What it answers columns');
  const sources = new Set(), slugs = new Set();
  return rows.slice(1).map(row => {
    const children = row[0]?.children ?? [];
    const link = children[0];
    const filename = link?.attrGet('href');
    if (row.length !== 2 || link?.type !== 'link_open' || children.at(-1)?.type !== 'link_close' || children.filter(token => token.type === 'link_open').length !== 1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename ?? '') || ['readme.md', 'agents.md', 'claude.md', 'skill.md'].includes(filename)) throw new Error('Public guide must link directly to a lowercase Markdown basename');
    const plain = ts => ts.filter(token => ['text', 'code_inline', 'softbreak'].includes(token.type)).map(token => token.type === 'softbreak' ? ' ' : token.content).join('');
    const label = plain(children), description = plain(row[1].children);
    if (!label.trim() || !description.trim() || row[1].children.some(token => token.type === 'html_inline')) throw new Error('Public guide requires a plain label and description');
    const source = 'docs/' + filename;
    const basename = filename.slice(0, -3), slug = legacySlugs.get(basename) ?? basename;
    if (sources.has(source) || slugs.has(slug)) throw new Error(`Duplicate public guide: ${filename}`);
    sources.add(source); slugs.add(slug);
    const markdown = readCanonical(webRoot, source).toString();
    const body = md.parse(markdown, {});
    if (body[0]?.type !== 'heading_open' || body[0].tag !== 'h1' || body.filter(token => token.type === 'heading_open' && token.tag === 'h1').length !== 1) throw new Error(`Guide requires one opening title: ${source}`);
    const title = plain(body[1].children);
    if (!title.trim()) throw new Error(`Guide requires a text title: ${source}`);
    return { source, slug, label, description, title, markdown };
  });
}

const repositoryUrl = 'https://github.com/sarada-io/contract-graph/blob/main/';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// These are published fragment identities, not independently maintained guide prose.
const aliases = {
  analyse: { assess: 'assessment', report: 'report', limits: 'limits', adopt: 'from-assessment-to-adoption', skill: 'optional-portable-harness-skill', 'assessment-prompt': 'assessment', 'analyse-command': 'assessment', 'init-preview': 'from-assessment-to-adoption', 'init-apply': 'from-assessment-to-adoption', 'warmup-prompt': 'from-assessment-to-adoption', 'analyse-json': 'optional-portable-harness-skill' },
  architecture: { mandatory: '1-what-is-mandatory', intent: 'intent-authority-and-implementation-evidence', responsibilities: '2-organize-around-responsibilities', placement: '3-every-change-has-a-placement-decision', boundaries: '4-declare-how-a-boundary-is-used', checks: '5-what-a01a16-actually-enforce', choices: '6-which-architectural-choices-remain-yours', adoption: '7-what-changes-after-installation', checklist: '8-a-short-review-checklist' },
  contracts: { boundary: 'one-artifact-per-boundary', recursive: 'the-recursive-model', fields: 'required-contract-fields', surfaces: 'declared-surfaces-are-concrete-promises', composition: 'composition-has-no-implicit-state', verification: 'invariants-and-verification-are-reciprocal', routing: 'routing-belongs-to-contracts', enforced: 'graph-invariants-enforced', schemas: 'public-schemas' },
  experts: { defaults: 'framework-source-structure', install: 'installed-structure', add: 'add-another-expert', ownership: 'ownership-and-upgrades', credit: 'upstream-credit-and-adaptation', coordinators: 'coordinators-and-workers' },
  intent: { need: 'project-and-module-intent', pages: 'project-and-module-intent', current: 'keep-context-current', review: 'review-and-record', evidence: 'what-the-evidence-means' },
  lifecycle: { bind: 'what-binds-a-change', walk: 'the-graph-walk', skills: 'the-lifecycle-skills', sprint: 'new-sprint-delivery', explore: 'exploratory-delivery', execution: 'contract-updates-belong-with-the-change' },
  prototype: { use: 'prototype', disk: 'what-remains-on-disk', review: 'acceptance-and-delivery', handoff: 'acceptance-and-delivery', states: 'acceptance-and-delivery', merge: 'merge-protection', experts: 'a-coordinator-during-exploration' },
  upgrade: { 'to-070': 'update-an-existing-installation', update: 'update-an-existing-installation', intent: 'shared-delivery-records-and-sign-off', init: 'what-init-updates', catalogs: 'legacy-content-recovery', retired: 'what-init-updates', records: 'shared-delivery-records-and-sign-off', experts: 'what-init-updates', older: 'legacy-content-recovery', limits: 'warmup-after-upgrading' },
  vision: { problem: 'product-intent-and-successful-outcomes', intent: 'product-intent-and-successful-outcomes', model: 'the-model', structure: 'structure-is-the-primary-control', route: 'route-first-read-code-second', confine: 'abstraction-confines-change', graph: 'why-it-is-a-graph', truth: 'keeping-the-graph-true', outcome: 'the-outcome', boundary: 'what-remains' },
  workflow: { path: 'agree-intent-then-deliver-a-sprint', sprint: 'organising-a-sprint-or-epic-plan', prototype: 'prototype-before-detailed-delivery', review: 'planning-readiness-and-production-review', execute: 'how-a-prepared-queue-is-executed', verify: 'verification-without-duplicate-work', docs: 'keeping-documentation-small', decisions: 'decision-consolidation-at-sign-off', trust: 'what-the-next-session-is-supposed-to-trust', records: 'delivery-records-and-routing', inspect: 'seeing-where-you-are' },
};

export function readSharedInput(webRoot, relative) {
  if (!fixedInputs.has(relative) && !loadGuides(webRoot).some(guide => guide.source === relative)) throw new Error(`Undeclared shared input: ${relative}`);
  return readCanonical(webRoot, relative);
}

export function documentationLink(href, source, guides = loadGuides()) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) return href;
  const split = href.search(/[?#]/);
  const filename = split < 0 ? href : href.slice(0, split);
  const suffix = split < 0 ? '' : href.slice(split);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), decodeURIComponent(filename)));
  if (target.startsWith('../')) throw new Error(`Documentation link escapes the repository: ${href}`);
  if (target === 'docs/README.md') return '/docs/' + suffix;
  const guide = guides.find(guide => guide.source === target);
  if (guide) return `/docs/${guide.slug}/` + suffix;
  if (['docs/assets/contract-graph-mark.webp', 'docs/assets/contract-graph-mark-white.webp'].includes(target)) return '/assets/' + path.posix.basename(target) + suffix;
  return repositoryUrl + target.split('/').map(encodeURIComponent).join('/') + suffix;
}

export function headingSlug(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-');
}

export function renderDocumentation(webRoot, guide, readSite, guides = loadGuides(webRoot)) {
  const { slug, source, markdown } = guide;
  const legacyAnchors = aliases[slug] ?? {};
  const md = new MarkdownIt({ html: true, linkify: false });
  const tokens = md.parse(markdown, {});
  const headings = [];
  const counts = new Map();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const inline = tokens[i + 1];
    const title = inline.children.filter(token => token.type === 'text' || token.type === 'code_inline').map(token => token.content).join('');
    const base = headingSlug(title), count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    tokens[i].attrSet('id', id);
    headings.push({ id, title, tag: tokens[i].tag });
  }
  const ids = new Set(headings.map(h => h.id));
  for (const [alias, target] of Object.entries(legacyAnchors)) {
    if (!ids.has(target)) throw new Error(`Legacy anchor ${slug}#${alias} has no target: ${target}`);
  }
  const heading = md.renderer.rules.heading_open ?? ((ts, idx, options, env, self) => self.renderToken(ts, idx, options));
  md.renderer.rules.heading_open = (ts, idx, options, env, self) => {
    const id = ts[idx].attrGet('id');
    const anchors = Object.entries(legacyAnchors).filter(([alias, target]) => target === id && alias !== id && !ids.has(alias)).map(([alias]) => `<span id="${escape(alias)}" aria-hidden="true"></span>`).join('');
    return anchors + heading(ts, idx, options, env, self);
  };
  const link = md.renderer.rules.link_open ?? ((ts, idx, options, env, self) => self.renderToken(ts, idx, options));
  md.renderer.rules.link_open = (ts, idx, options, env, self) => {
    ts[idx].attrSet('href', documentationLink(ts[idx].attrGet('href'), source, guides));
    return link(ts, idx, options, env, self);
  };
  const image = md.renderer.rules.image;
  md.renderer.rules.image = (ts, idx, options, env, self) => {
    ts[idx].attrSet('src', documentationLink(ts[idx].attrGet('src'), source, guides));
    return image(ts, idx, options, env, self);
  };
  let diagram = 0, code = 0;
  const figures = tokens.some(token => token.type === 'fence' && token.info.trim() === 'mermaid')
    ? JSON.parse(readSite(`pages/docs/${slug}/figures.json`)) : [];
  md.renderer.rules.fence = (ts, idx) => {
    const token = ts[idx];
    if (token.info.trim() === 'mermaid') {
      const figure = figures[diagram++];
      const digest = crypto.createHash('sha256').update(token.content).digest('hex');
      if (!figure || figure.sha256 !== digest) throw new Error(`Guide figure ${diagram} is stale; regenerate its presentation from ${source}`);
      return readSite(figure.source).toString();
    }
    const id = `doc-code-${++code}`;
    return `<div class="code-block"><pre><code id="${id}">${escape(token.content)}</code></pre><button class="copy-btn" type="button" data-copy="${id}" aria-label="Copy code example">Copy</button></div>\n`;
  };
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';
  // The existing hero supplies the single h1; keep its canonical ID available for deep links.
  const title = headings.find(h => h.tag === 'h1');
  if (!title || tokens[0].type !== 'heading_open' || tokens[0].tag !== 'h1') throw new Error(`Guide requires an opening title: ${source}`);
  const titleAliases = Object.entries(legacyAnchors).filter(([alias, target]) => target === title.id && alias !== title.id).map(([alias]) => `<span id="${escape(alias)}" aria-hidden="true"></span>`).join('');
  const body = md.renderer.render(tokens.slice(3), md.options, {});
  if (diagram !== figures.length) throw new Error('Guide figure inventory does not match the canonical guide');
  const navigation = headings.filter(h => h.tag === 'h2').map(h => `<li><a href="#${escape(h.id)}">${escape(h.title)}</a></li>`).join('');
  return `<nav class="doc-nav" aria-label="On this page"><p>On this page</p><ul>${navigation}</ul></nav><article class="prose"><span id="${escape(title.id)}" aria-hidden="true"></span>${titleAliases}${body}</article>`;
}

export function sharedSchemas(webRoot) {
  const output = new Map();
  for (const name of schemaNames) {
    const bytes = readSharedInput(webRoot, `src/cg/schema/${name}.schema.json`);
    if (JSON.parse(bytes).$id !== `https://contractgraph.dev/schema/${name}-v1.schema.json`) throw new Error(`Unexpected schema identity: ${name}`);
    for (const prefix of ['schema', 'contract-graph/schema']) output.set(`${prefix}/${name}-v1.schema.json`, bytes);
  }
  return output;
}

export function sharedBrandAssets(webRoot) {
  return new Map(brandNames.map(name => [`assets/${name}`, readSharedInput(webRoot, `docs/assets/${name}`)]));
}
