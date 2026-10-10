#!/usr/bin/env node
// Local Qollab-like runner for ECHO. Node serves files only; the project runs in
// the browser on the same Pyodide build and the same Qiskit wheel that Qollab
// loads (see README.md § What it mimics, with sources).
//
//   node tools/qollab-runner/server.mjs --port 4871 [--project echo]
//
// This is a LOCAL RUNNER. A result here is never a Qollab or IonQ result.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

// Observed 2026-10-09 in the network log of a signed-out Built-in-simulator run
// of qollab/qcflows-multifile: Qollab installs this wheel from its own /py index.
// It is served without CORS headers, so the runner caches a copy and serves it.
export const QISKIT_WHEEL = 'qiskit-2.5.2-cp310-abi3-pyemscripten_2026_0_wasm32.whl';
const QISKIT_WHEEL_URL = `https://qollab.xyz/py/${QISKIT_WHEEL}?v=27`;
const CACHE = path.join(HERE, '.cache');

// Qollab limits (runtime-environment § Limits).
export const MAX_FILES = 100;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const TEXT_EXT = new Set(['.js', '.mjs', '.py', '.html', '.css', '.txt', '.json', '.md', '.csv']);
// Qollab drops these on upload (upload-your-files).
const DROPPED = new Set(['.git', '__MACOSX', '.DS_Store']);

function args() {
  const a = process.argv.slice(2);
  const get = (k) => {
    const i = a.indexOf(k);
    return i >= 0 ? a[i + 1] : undefined;
  };
  const port = Number(get('--port') ?? process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) {
    console.error('usage: node tools/qollab-runner/server.mjs --port <your own port> [--project <dir>]');
    process.exit(2);
  }
  return { port, project: path.resolve(REPO, get('--project') ?? 'echo') };
}

export function listProject(root) {
  const files = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (DROPPED.has(ent.name) || ent.name === '__pycache__') continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs);
      else files.push({ path: path.relative(root, abs).split(path.sep).join('/'), size: fs.statSync(abs).size, abs });
    }
  };
  walk(root);
  files.sort((x, y) => x.path.localeCompare(y.path));
  return files;
}

function projectPayload(root) {
  const files = listProject(root);
  const problems = [];
  if (files.length > MAX_FILES) problems.push(`${files.length} files > Qollab limit of ${MAX_FILES}`);
  for (const f of files) if (f.size > MAX_FILE_BYTES) problems.push(`${f.path} is ${f.size} bytes > 2 MB`);
  if (!files.some((f) => f.path === 'index.html') || !files.some((f) => f.path === 'main.js'))
    problems.push('index.html and main.js must both be at the project root to make a JS project');
  const text = {};
  for (const f of files) if (TEXT_EXT.has(path.extname(f.path))) text[f.path] = fs.readFileSync(f.abs, 'utf8');
  return { root, files: files.map(({ path: p, size }) => ({ path: p, size })), problems, text };
}

async function ensureWheel() {
  const dest = path.join(CACHE, QISKIT_WHEEL);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) return dest;
  fs.mkdirSync(CACHE, { recursive: true });
  console.log(`runner: caching ${QISKIT_WHEEL_URL} (GET, one time)`);
  const res = await fetch(QISKIT_WHEEL_URL);
  if (!res.ok) throw new Error(`could not fetch the Qiskit wheel: HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.whl': 'application/zip' };

function send(res, status, body, type = 'text/plain') {
  // The project frame is sandboxed without allow-same-origin, so its origin is
  // "null" (as on Qollab) and every request back to this server is cross-origin.
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function main() {
  const { port, project } = args();
  if (!fs.existsSync(project)) {
    console.error(`runner: project dir not found: ${project}`);
    process.exit(2);
  }
  const wheel = await ensureWheel();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'GET only');
    const p = url.pathname;
    if (p === '/' || p === '/index.html') return send(res, 200, fs.readFileSync(path.join(HERE, 'host.html')), TYPES['.html']);
    if (p === '/project.json') return send(res, 200, JSON.stringify(projectPayload(project)), TYPES['.json']);
    if (p === `/py/${QISKIT_WHEEL}`) return send(res, 200, fs.readFileSync(wheel), TYPES['.whl']);
    if (['/frame.html', '/frame.js', '/host.js'].includes(p))
      return send(res, 200, fs.readFileSync(path.join(HERE, p.slice(1))), TYPES[path.extname(p)]);
    // JS cannot read project files on Qollab, so the runner serves none directly.
    return send(res, 404, 'not found');
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`runner: LOCAL Qollab-like runner on http://127.0.0.1:${port}/  project=${project}`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
