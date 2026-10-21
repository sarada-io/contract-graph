/**
 * @file Server for the website target.
 * @see ../.agent/contract.md
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { buildSite } from '../../site/publication.mjs';
import { getPublicRoot, DEV_PORT } from '../paths.mjs';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

export function resolvePublicFile(urlPath, publicRoot) {
  const decoded = decodeURIComponent(String(urlPath || '/').split('?')[0].split('#')[0]);
  const publicReal = fs.realpathSync(publicRoot);
  let relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  if (relative.endsWith('/')) relative += 'index.html';
  const candidate = path.resolve(publicRoot, relative);
  const fromPublic = path.relative(publicReal, candidate);
  if (!fromPublic || fromPublic.startsWith('..') || path.isAbsolute(fromPublic)) return null;
  if (fs.existsSync(candidate)) {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) return candidate;
    if (stat.isDirectory()) {
      const index = path.join(candidate, 'index.html');
      if (fs.existsSync(index) && fs.statSync(index).isFile()) return index;
    }
  }
  return null;
}

export function handleStaticRequest(req, res, publicRoot) {
  const file = resolvePublicFile(req.url, publicRoot);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  const body = fs.readFileSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
  if (req.method === 'HEAD') res.end();
  else res.end(body);
}

export function createStaticServer(publicRoot = getPublicRoot(), { prepare } = {}) {
  return http.createServer((req, res) => {
    try {
      // Rebuild on page navigation/reload. Asset requests consume that completed build.
      const pathname = String(req.url || '/').split('?')[0];
      if (prepare && (!path.extname(pathname) || pathname.endsWith('.html'))) prepare();
      handleStaticRequest(req, res, publicRoot);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Preview build failed: ${error.message}\n`);
    }
  });
}

export function openUrl(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.unref();
}

export function startLocalServer({ port = DEV_PORT, publicRoot = getPublicRoot(), open = true } = {}) {
  const prepare = path.resolve(publicRoot) === getPublicRoot() ? () => buildSite() : undefined;
  if (prepare) prepare();
  if (!fs.existsSync(path.join(publicRoot, 'index.html'))) {
    throw new Error('public/index.html was not found.');
  }
  const server = createStaticServer(publicRoot, { prepare });
  return new Promise((resolve, reject) => {
    const stop = () => {
      server.close(() => resolve(0));
    };
    server.on('error', reject);
    server.listen(port, () => {
      const url = `http://localhost:${port}/`;
      process.stdout.write(`Serving public/ at ${url}\nPress Ctrl+C to stop.\n`);
      if (open) {
        try { openUrl(url); } catch { /* preview still works if a browser cannot open */ }
      }
    });
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}
