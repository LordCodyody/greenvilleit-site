#!/usr/bin/env node
// Minimal static file server with directory-index support
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    let p = join(ROOT, urlPath);
    try {
      const s = await stat(p);
      if (s.isDirectory()) p = join(p, 'index.html');
    } catch {
      // Try `<path>/index.html` for routes without trailing slash
      try {
        const s2 = await stat(join(ROOT, urlPath, 'index.html'));
        if (s2.isFile()) p = join(ROOT, urlPath, 'index.html');
      } catch {
        // 404
        const notFound = await readFile(join(ROOT, '404.html')).catch(() => '404');
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFound);
        return;
      }
    }
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error: ' + e.message);
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}`));
