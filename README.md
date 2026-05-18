# greenvilleitconsulting.com

Static marketing site for Greenville IT Consulting LLC.

- **Framework:** none — plain HTML/CSS/JS with a tiny Node build script
- **Hosting:** GitHub Pages (with custom domain via `CNAME`)
- **Deploy:** push to `main` → GitHub Actions builds and publishes

## Local development

```bash
node build.mjs        # build into ./dist
node serve.mjs        # serve ./dist at http://localhost:8765
```

## Structure

```
src/
  partials/   # layout, header, footer (template fragments)
  pages/      # page content with a front-matter comment for title/description
public/       # static assets copied verbatim into dist/
build.mjs     # the build
serve.mjs     # local preview server
```

## Editing a page

1. Open the page under `src/pages/`.
2. Update the front-matter comment block at the top for title/description.
3. Edit the HTML body below it. Use `{{booking}}`, `{{email}}`, `{{year}}`, `{{gtm_stacks}}` placeholders.
4. Run `node build.mjs && node serve.mjs` to preview.
5. Commit and push — Actions will deploy.

## Notes

- The `_redirects` file is for Cloudflare Pages if/when the host is switched. GitHub Pages doesn't honor it — the same redirects are also generated as static `meta http-equiv="refresh"` stub pages so the old Wix URLs work on both hosts.
- Cloudflare Web Analytics snippet placeholder is in `src/partials/layout.html`. Replace the token before publishing if you want analytics enabled.

## Cutover to the custom domain (greenvilleitconsulting.com)

The build is currently configured for the github.io preview URL at
`https://lordcodyody.github.io/greenvilleitconsulting.com/`. When ready to point
the custom domain at this site:

1. Move `CNAME.production` into `public/CNAME` (so it gets deployed):
   `mv CNAME.production public/CNAME`
2. Remove the `BASE_PATH` env block from `.github/workflows/deploy.yml`.
3. Update DNS for `greenvilleitconsulting.com` to point at GitHub Pages
   (A records `185.199.108.153 / .109.153 / .110.153 / .111.153`, plus the
   four AAAA records, or a CNAME for `www` → `lordcodyody.github.io`).
4. Commit and push. Pages will pick up the CNAME and provision HTTPS.
