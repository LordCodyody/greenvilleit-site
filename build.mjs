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
    // Block search engines from indexing the github.io preview deploy.
    // When BASE_PATH is empty (production), allow indexing.
    const robots = BASE_PATH
      ? '<meta name="robots" content="noindex,nofollow" />'
      : '';
    const schema = buildSchema({ url, title: meta.title, description: meta.description, canonical });
    const partialVars = { booking: BOOKING_URL, current: url, gtm_stacks: GTM_STACKS_URL, base: BASE_PATH, year: YEAR, email: EMAIL };
    const vars = {
      title: meta.title || 'Greenville IT Consulting',
      description: meta.description || '',
      canonical,
      robots,
      schema,
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
  const today = new Date().toISOString().slice(0, 10);
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
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

  // Override robots.txt for the preview deploy so it isn't indexed.
  if (BASE_PATH) {
    await writeFile(
      join(DIST, 'robots.txt'),
      'User-agent: *\nDisallow: /\n'
    );
  }

  console.log('\nDone. Output: dist/');
}

function slugClass(url) {
  return 'page' + url.replace(/\//g, '-').replace(/-+$/, '') || 'page-home';
}

function buildSchema({ url, title, description, canonical }) {
  const orgRef = { '@id': `${SITE_URL}/#business` };

  if (url === '/') {
    const org = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ProfessionalService',
          '@id': `${SITE_URL}/#business`,
          name: 'Greenville IT Consulting LLC',
          url: SITE_URL,
          image: `${SITE_URL}/assets/og-image.png`,
          description: 'Security-first IT consulting for small and midsized businesses across Upstate South Carolina and the broader Southeast.',
          email: EMAIL,
          priceRange: '$$',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Greenville',
            addressRegion: 'SC',
            addressCountry: 'US',
          },
          areaServed: [
            { '@type': 'State', name: 'South Carolina' },
            { '@type': 'State', name: 'North Carolina' },
            { '@type': 'State', name: 'Georgia' },
            { '@type': 'State', name: 'Tennessee' },
          ],
          founder: { '@id': `${SITE_URL}/#cody` },
          knowsAbout: [
            'IT Security',
            'CISSP',
            'Microsoft 365',
            'Google Workspace',
            'DMARC',
            'Conditional Access',
            'Microsoft Purview',
            'Intune',
            'Workflow Automation',
            'n8n',
            'Compliance Engineering',
          ],
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Greenville IT Consulting services',
            itemListElement: [
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'IT Security & Compliance' } },
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Managed & Co-Managed IT' } },
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Automation & AI for SMBs' } },
              { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Networking & Infrastructure' } },
            ],
          },
        },
        {
          '@type': 'Person',
          '@id': `${SITE_URL}/#cody`,
          name: 'Cody Jeziorski',
          jobTitle: 'CISSP-credentialed IT Consultant',
          worksFor: { '@id': `${SITE_URL}/#business` },
          sameAs: ['https://www.linkedin.com/in/codyjeziorski/'],
          hasCredential: {
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'certification',
            name: 'Certified Information Systems Security Professional (CISSP)',
          },
        },
      ],
    };
    return `<script type="application/ld+json">${JSON.stringify(org)}</script>`;
  }

  // Page-specific schemas
  if (url === '/scan/') {
    return `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Offer',
      name: 'Free IT Security Scan',
      description: 'A read-only, vendor-neutral check of email authentication (DMARC/SPF/DKIM), exposed credentials, and external misconfigurations. Results delivered within one business day.',
      url: canonical,
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      offeredBy: orgRef,
    })}</script>`;
  }
  if (url === '/services/') {
    return `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: canonical,
      name: title,
      description,
      isPartOf: { '@type': 'WebSite', name: 'Greenville IT Consulting', url: SITE_URL },
      about: orgRef,
    })}</script>`;
  }
  // Default for interior pages: lightweight WebPage referencing the org
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: canonical,
    name: title,
    description,
    isPartOf: { '@type': 'WebSite', name: 'Greenville IT Consulting', url: SITE_URL },
    about: orgRef,
  })}</script>`;
}

build().catch(e => {
  console.error(e);
  process.exit(1);
});
