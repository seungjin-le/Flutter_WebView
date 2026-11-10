// Local-only HTTP fixture for real WebView integration tests; never deployed.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../apps/web/dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
let recoveryFails = true;
createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/__control/recover' && request.method === 'POST') {
    recoveryFails = new URL(request.url, 'http://localhost').searchParams.get('fail') !== 'false';
    response.end('OK'); return;
  }
  if (pathname === '/disconnect') { request.socket.destroy(); return; }
  if (pathname === '/slow') { const timer = setTimeout(() => response.end('late'), 35000); response.on('close', () => clearTimeout(timer)); return; }
  if (pathname === '/failure' || (pathname === '/recover' && recoveryFails)) {
    response.writeHead(503, { 'content-type': 'text/plain' }); response.end('Unavailable'); return;
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const file = resolve(root, `.${decoded}`);
  if (file != resolve(root) && !file.startsWith(root.endsWith(sep) ? root : root + sep)) {
    response.writeHead(403); response.end(); return;
  }
  const requested = extname(file) ? file : resolve(root, 'index.html');
  try {
    const data = await readFile(requested);
    response.writeHead(200, { 'content-type': types[extname(requested)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(5174, '127.0.0.1', () => console.log('Native fixture: http://127.0.0.1:5174'));
