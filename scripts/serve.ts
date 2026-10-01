/**
 * Serves `dist/` on http://localhost:4180/ (or `PORT`), the way the site serves it: plain files,
 * the right types, no cross-origin isolation. For playing the page locally after `pnpm build`.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { byteRange } from './http-range.ts';

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
  const asset = found?.isDirectory() ? await stat(file).catch(() => null) : found;
  if (!asset?.isFile()) return response.writeHead(404).end();
  response.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  response.setHeader('Accept-Ranges', 'bytes');
  const requested = request.headers.range;
  const range = requested ? byteRange(requested, asset.size) : null;
  if (requested && !range) {
    response.setHeader('Content-Range', `bytes */${asset.size}`);
    return response.writeHead(416).end();
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? asset.size - 1;
  response.setHeader('Content-Length', end - start + 1);
  if (range) response.setHeader('Content-Range', `bytes ${start}-${end}/${asset.size}`);
  response.writeHead(range ? 206 : 200);
  if (request.method === 'HEAD' || asset.size === 0) return response.end();
  createReadStream(file, { start, end })
    .on('error', (error) => response.destroy(error))
    .pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
