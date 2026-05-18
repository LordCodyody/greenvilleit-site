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
- `CNAME` file in `public/` configures the GitHub Pages custom domain.
