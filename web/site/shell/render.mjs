/**
 * @file Render for the website target.
 * @see .agent/contract.md
 */
/** Render the website's common shell. Inputs are repository-owned HTML and metadata. */
export function renderTemplate(template, slots) {
  const names = [...template.matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]);
  for (const name of names) {
    if (!Object.hasOwn(slots, name)) throw new Error(`Unknown template slot: ${name}`);
    if (typeof slots[name] !== 'string') throw new Error(`Missing string for template slot: ${name}`);
  }
  for (const name of Object.keys(slots)) {
    if (!names.includes(name)) throw new Error(`Template is missing required slot: ${name}`);
  }
  // One pass: inserted page HTML is data, never another template to evaluate.
  return template.replace(/\{\{([^{}]+)\}\}/g, (_, name) => slots[name]);
}

const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const required = ['output', 'title', 'description', 'canonical', 'ogType', 'ogTitle', 'ogDescription', 'twitterCard', 'socialImage', 'socialWidth', 'socialHeight', 'socialAlt', 'bodyClass', 'current', 'styleVersion', 'scriptVersion'];

export function renderPage(metadata, body, templates, structuredData = '') {
  for (const key of required) {
    if (typeof metadata[key] !== 'string') throw new Error(`Page metadata requires string: ${key}`);
  }
  for (const key of Object.keys(metadata)) {
    if (![...required, 'faviconIco', 'structuredData'].includes(key)) throw new Error(`Unknown page metadata: ${key}`);
  }
  if (typeof metadata.faviconIco !== 'boolean' || (metadata.structuredData !== undefined && typeof metadata.structuredData !== 'boolean')) throw new Error('Page flags must be booleans');
  if (!['', 'home', 'problem', 'ways', 'start', 'docs'].includes(metadata.current)) throw new Error('Unknown current navigation destination');
  const url = metadata.output === 'index.html' ? '/' : '/' + metadata.output.replace(/index\.html$/, '');
  if (metadata.canonical !== 'https://contractgraph.dev' + url) throw new Error(`Canonical URL does not match output: ${metadata.output}`);
  const attr = name => escape(metadata[name]);
  const social = (property, value) => value ? `  <meta property="${property}" content="${escape(value)}">\n` : '';
  const head = renderTemplate(templates.head, {
    title: attr('title'), description: attr('description'), canonical: attr('canonical'),
    ogType: attr('ogType'), ogTitle: attr('ogTitle'), ogDescription: attr('ogDescription'),
    twitterCard: attr('twitterCard'), styleVersion: attr('styleVersion'),
    socialImage: social('og:image', metadata.socialImage),
    socialDimensions: social('og:image:width', metadata.socialWidth) + social('og:image:height', metadata.socialHeight),
    socialAlt: social('og:image:alt', metadata.socialAlt), structuredData,
    faviconIco: metadata.faviconIco ? '  <link rel="icon" href="/assets/favicon.ico" sizes="48x48">\n' : '',
    themeBootstrap: templates.theme,
  });
  const navigation = Object.fromEntries(['home', 'problem', 'ways', 'start', 'docs'].map(name => [name + 'Current', metadata.current === name ? ' aria-current="page"' : '']));
  return renderTemplate(templates.document, {
    head, header: renderTemplate(templates.header, navigation), footer: templates.footer, body,
    bodyClass: metadata.bodyClass ? ` class="${attr('bodyClass')}"` : '', scriptVersion: attr('scriptVersion'),
  });
}
