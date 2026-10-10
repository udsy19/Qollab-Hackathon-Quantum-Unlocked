#!/usr/bin/env node
// tools/art-preview/serve.mjs — dev-only static server for the art preview (never uploaded).
//   node tools/art-preview/serve.mjs [port] [gameplay-branch]
// Serves the worktree root, and /gameplay/<path> straight out of gameplay's branch with `git show`, so
// the preview drops art's modules into gameplay's REAL graybox without copying a line of it.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join, extname, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = Number(process.argv[2] ?? 5147)
const BRANCH = process.argv[3] ?? 'lane/gameplay/gameplay-world-controller'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  try {
    let body
    if (path.startsWith('/gameplay/')) {
      const rel = path.slice('/gameplay/'.length)
      if (!/^[\w./-]+$/.test(rel) || rel.includes('..')) throw new Error('bad path')
      body = execFileSync('git', ['-C', ROOT, 'show', `${BRANCH}:${rel}`])
    } else {
      const file = resolve(ROOT, '.' + (path.endsWith('/') ? path + 'index.html' : path))
      if (!file.startsWith(ROOT)) throw new Error('outside root')
      body = await readFile(file)
    }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? (path.endsWith('/') ? 'text/html' : 'application/octet-stream'), 'cache-control': 'no-store' })
    res.end(body)
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end(`404 ${path}: ${e.message}`)
  }
}).listen(PORT, '127.0.0.1', () => console.log(`art preview: http://127.0.0.1:${PORT}/tools/art-preview/  (gameplay from ${BRANCH})`))
