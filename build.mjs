#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, copyFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, basename, extname } from 'node:path';

const ROOT = dirname(new URL(import.meta.url).pathname);
const SRC = join(ROOT, 'src');
const PUBLIC_DIR = join(ROOT, 'public');
const DIST = join(ROOT, 'dist');

const SITE_URL = process.env.SITE_URL || 'https://greenvilleitconsulting.com';
const BOOKING_URL = 'https://cal.com/codyjeziorski/30min';
const EMAIL = 'info@greenvilleitconsulting.com';
const GTM_STACKS_URL = 'https://lordcodyody.github.io/gtm-stacks/';
const YEAR = new Date().getFullYear();
// BASE_PATH is the URL prefix for assets and internal links.
// Empty string for custom domain (greenvilleitconsulting.com), or '/<repo>' for the github.io subpath preview.
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

const layout = await readFile(join(SRC, 'partials', 'layout.html'), 'utf8');
const header = await readFile(join(SRC, 'partials', 'header.html'), 'utf8');
const footer = await readFile(join(SRC, 'partials', 'footer.html'), 'utf8');

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await copyFile(s, d);
  }
}

function parseFrontMatter(text) {
  const match = text.match(/^<!--\s*([\s\S]*?)\s*-->\s*\n/);
  const meta = {};
  let body = text;
  if (match) {
    body = text.slice(match[0].length);
    for (const line of match[1].split('\n')) {
      const m = line.match(/^\s*([a-zA-Z_]+):\s*(.+)\s*$/);
      if (m) meta[m[1]] = m[2].trim();
    }
  }
  return { meta, body };
}

function render(template, vars) {
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : ''
  );
}

async function findPages(dir, list = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await findPages(p, list);
    else if (entry.name.endsWith('.html')) list.push(p);
  }
  return list;
}

async function build() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true });
  await mkdir(DIST, { recursive: true });
  if (existsSync(PUBLIC_DIR)) await copyDir(PUBLIC_DIR, DIST);

  const pagesDir = join(SRC, 'pages');
  const pages = await findPages(pagesDir);

  for (const page of pages) {
    const text = await readFile(page, 'utf8');
    const { meta, body } = parseFrontMatter(text);

    const rel = relative(pagesDir, page).replace(/\\/g, '/');
    let url;
    let outPath;
    if (rel === 'index.html') {
      url = '/';
      outPath = join(DIST, 'index.html');
    } else if (rel === '404.html') {
      url = '/404';
      outPath = join(DIST, '404.html');
    } else {
      const slug = rel.replace(/\.html$/, '');
      url = '/' + slug + '/';
      outPath = join(DIST, slug, 'index.html');
    }

    const canonical = SITE_URL + (url === '/' ? '/' : url);
    const partialVars = { booking: BOOKING_URL, current: url, gtm_stacks: GTM_STACKS_URL, base: BASE_PATH, year: YEAR, email: EMAIL };
    const vars = {
      title: meta.title || 'Greenville IT Consulting',
      description: meta.description || '',
      canonical,
      url,
      page_class: meta.page_class || slugClass(url),
      year: YEAR,
      email: EMAIL,
      booking: BOOKING_URL,
      base: BASE_PATH,
      og_image: SITE_URL + '/assets/og-image.png',
      site_url: SITE_URL,
      header: render(header, partialVars),
      footer: render(footer, partialVars),
      content: render(body, partialVars),
      extra_head: meta.extra_head ? meta.extra_head : '',
    };

    let html = render(layout, vars);
    if (BASE_PATH) {
      // Rewrite root-relative href/src in built output to include BASE_PATH.
      // Skip protocol-relative (//) and anchor-only (#…) URLs.
      html = html.replace(/(href|src)="\/(?!\/)([^"#][^"]*|)"/g, (_m, attr, rest) =>
        `${attr}="${BASE_PATH}/${rest}"`
      );
    }
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html);
    console.log('built', relative(ROOT, outPath));
  }

  // Sitemap
  const urls = pages
    .map(p => relative(pagesDir, p).replace(/\\/g, '/'))
    .filter(r => r !== '404.html')
    .map(r => (r === 'index.html' ? '/' : '/' + r.replace(/\.html$/, '') + '/'));
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}
</urlset>
`;
  await writeFile(join(DIST, 'sitemap.xml'), sm);

  // Old-URL redirect stubs for GitHub Pages (Cloudflare _redirects also generated)
  const redirects = [
    ['/professional-it-services', '/industries/'],
    ['/professional-it-services/smb', '/industries/smb/'],
    ['/professional-it-services/property-management', '/industries/property-management/'],
    ['/professional-it-services/builders', '/industries/builders/'],
    ['/professional-it-services/real-estate-agents', '/industries/real-estate/'],
    ['/farmers', '/industries/farmers/'],
    ['/professional-it-services/dbm', '/services/'],
    ['/about-us', '/about/'],
  ];

  for (const [from, to] of redirects) {
    const stubPath = join(DIST, from.replace(/^\//, ''), 'index.html');
    const dest = BASE_PATH + to;
    await mkdir(dirname(stubPath), { recursive: true });
    await writeFile(
      stubPath,
      `<!doctype html><meta charset="utf-8"><title>Redirecting…</title><meta http-equiv="refresh" content="0; url=${dest}"><link rel="canonical" href="${SITE_URL}${to}"><script>location.replace(${JSON.stringify(dest)})</script><p>Redirecting to <a href="${dest}">${dest}</a>.</p>`
    );
  }

  const cf = redirects.map(([f, t]) => `${f} ${t} 301`).join('\n') + '\n';
  await writeFile(join(DIST, '_redirects'), cf);

  console.log('\nDone. Output: dist/');
}

function slugClass(url) {
  return 'page' + url.replace(/\//g, '-').replace(/-+$/, '') || 'page-home';
}

build().catch(e => {
  console.error(e);
  process.exit(1);
});
