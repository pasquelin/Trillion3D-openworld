/**
 * Serves `dist/` on http://localhost:4180/ (or `PORT`), the way the site serves it: plain files,
 * the right types, no cross-origin isolation. For playing the page locally after `pnpm build`.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist');
const port = Number(process.env.PORT ?? 4180);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  let file = resolve(dist, `.${path}`);
  if (file !== dist && !file.startsWith(dist + sep)) return response.writeHead(403).end();
  const found = await stat(file).catch(() => null);
  if (found?.isDirectory()) file = resolve(file, 'index.html');
  else if (!found) return response.writeHead(404).end();
  response.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  createReadStream(file)
    .on('error', () => response.writeHead(404).end())
    .pipe(response);
}).listen(port, () => console.log(`http://localhost:${port}/`));
