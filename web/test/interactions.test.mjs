/**
 * @file Interactions.test for the website target.
 * @see ../site/interactions/.agent/contract.md
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { assembleSite } from '../site/publication.mjs';

class Element {
  constructor(attrs = {}) { this.attrs = attrs; this.events = {}; this.dataset = {}; this.classes = new Set(); this.classList = { toggle: (key, enabled) => enabled ? this.classes.add(key) : this.classes.delete(key) }; this.textContent = ''; }
  set src(value) { this.attrs.src = value; }
  get src() { return this.attrs.src; }
  addEventListener(name, fn) { (this.events[name] ??= []).push(fn); }
  fire(name, event = {}) { for (const fn of this.events[name] ?? []) fn({ target: this, stopPropagation() {}, preventDefault() {}, ...event }); }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  querySelector() { return this.label ?? null; }
  querySelectorAll() { return this.links ?? []; }
  contains(target) { return target === this; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
}
function browser({ stored = null, hash = '', clipboard } = {}) {
  const nav = new Element(), toggle = new Element({ 'aria-expanded': 'false' }); toggle.label = new Element();
  const theme = new Element(); theme.label = new Element();
  const root = new Element({ 'data-theme': 'dark' }), colour = new Element();
  const dialog = new Element(), frame = new Element(), close = new Element(); frame.dataset.src = 'https://example.test/video';
  const copy = new Element({ 'data-copy': 'command' }); copy.textContent = 'Copy';
  const command = new Element(); command.innerText = '  cg init  ';
  const panels = [new Element(), new Element()];
  const tabs = panels.map((_, i) => { const e = new Element({ 'aria-controls': `panel-${i}` }); e.dataset.quickTab = String(i); return e; });
  const document = new Element();
  document.documentElement = root; document.readyState = 'loading';
  const scripts = []; document.head = { appendChild: e => scripts.push(e) }; document.createElement = () => new Element();
  document.querySelector = selector => ({ '.nav-toggle': toggle, '[data-theme-toggle]': theme, 'meta[name="theme-color"]': colour, '[data-video-close]': close })[selector] ?? null;
  document.querySelectorAll = selector => selector === '[data-quick-tab]' ? tabs : selector === '[data-copy]' ? [copy] : [];
  document.getElementById = id => ({ command, 'site-nav': nav, 'contract-video-dialog': dialog, 'contract-video-frame': frame, 'panel-0': panels[0], 'panel-1': panels[1] })[id] ?? null;
  const window = new Element(), dark = new Element(), desktop = new Element(); dark.matches = true;
  window.matchMedia = query => query.includes('prefers-color') ? dark : desktop;
  window.location = { pathname: '/', search: '', hash };
  const idle = []; window.requestIdleCallback = fn => idle.push(fn); window.setTimeout = fn => idle.push(fn);
  const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const history = { replaceState: (_, __, url) => { window.location.hash = ''; history.url = url; } };
  vm.runInNewContext(assembleSite().get('site.js').toString(), { window, document, localStorage: storage, history, navigator: { clipboard }, Set, Date });
  return { copy, nav, toggle, theme, root, colour, dialog, frame, close, document, window, dark, desktop, tabs, panels, idle, scripts, history, storage };
}

test('mobile navigation opens and closes by Escape, outside click and desktop transition', () => {
  const b = browser(); b.toggle.fire('click');
  assert.equal(b.toggle.attrs['aria-expanded'], 'true'); assert.ok(b.nav.classes.has('is-open'));
  b.document.fire('keydown', { key: 'Escape' }); assert.equal(b.toggle.attrs['aria-expanded'], 'false');
  b.toggle.fire('click'); b.document.fire('click', { target: new Element() }); assert.equal(b.toggle.attrs['aria-expanded'], 'false');
  b.toggle.fire('click'); b.desktop.fire('change', { matches: true }); assert.equal(b.toggle.attrs['aria-expanded'], 'false');
});
test('theme follows system until an explicit override, then preserves the override', () => {
  const b = browser(); assert.equal(b.root.attrs['data-theme'], 'dark');
  b.dark.matches = false; b.dark.fire('change'); assert.equal(b.root.attrs['data-theme'], 'light');
  b.theme.fire('click'); assert.equal(b.storage.getItem(), 'dark');
  b.dark.fire('change'); assert.equal(b.root.attrs['data-theme'], 'dark');
  assert.equal(browser({ stored: 'light' }).root.attrs['data-theme'], 'light');
});
test('quick-start keyboard navigation updates selection, panels, focus and analytics', () => {
  const b = browser(); b.tabs[0].fire('keydown', { key: 'ArrowRight' });
  assert.equal(b.tabs[1].attrs['aria-selected'], 'true'); assert.equal(b.tabs[1].tabIndex, 0);
  assert.equal(b.panels[0].hidden, true); assert.equal(b.panels[1].hidden, false); assert.equal(b.tabs[1].focused, true);
  assert.ok(b.window.dataLayer.some(args => args[1] === 'cg_quick_start_tab'));
});
test('video hash opens the legacy dialog and closing removes iframe src and hash', () => {
  const b = browser({ hash: '#watch' }); assert.equal(b.dialog.open, true); assert.equal(b.frame.src, b.frame.dataset.src);
  b.close.fire('click'); assert.equal(b.dialog.open, false); assert.equal(b.frame.getAttribute('src'), null); assert.equal(b.window.location.hash, '');
  b.window.location.hash = '#watch'; b.window.fire('hashchange'); assert.equal(b.dialog.open, true);
});
test('analytics config preserves the property and defers script loading until load and idle', () => {
  const b = browser(); assert.equal(b.scripts.length, 0); assert.equal(b.idle.length, 0);
  assert.ok(b.window.dataLayer.some(args => args[0] === 'config' && args[1] === 'G-WFGE117XBY'));
  b.window.fire('load'); assert.equal(b.scripts.length, 0); b.idle[0]();
  assert.equal(b.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-WFGE117XBY');
});

test('copy reports success and failure without changing the command text', async () => {
  let written;
  const b = browser({ clipboard: { writeText: async text => { written = text; } } });
  await b.copy.events.click[0](); assert.equal(written, 'cg init'); assert.equal(b.copy.textContent, 'Copied');
  b.idle.at(-1)(); assert.equal(b.copy.textContent, 'Copy');
  const failed = browser({ clipboard: { writeText: async () => { throw new Error('denied'); } } });
  await failed.copy.events.click[0](); assert.equal(failed.copy.textContent, 'Copy failed');
});
