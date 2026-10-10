// Starts dev/gameplay/dev_engine.py (real Qiskit, local CPython) on a free port for one test file.
// A server that does not come up within 30 s fails the file loudly; it is never a skip.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDevEngine } from '../devEngine.js';

const SERVER = fileURLToPath(new URL('../dev_engine.py', import.meta.url));

export async function startDevEngine() {
  const proc = spawn(process.env.PYTHON ?? 'python3', [SERVER, '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  proc.stderr.on('data', (d) => { err += d; });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`dev engine did not start in 30 s: ${err}`)), 30000);
    proc.stdout.on('data', (d) => {
      const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(String(d));
      if (m) { clearTimeout(timer); resolve(`http://127.0.0.1:${m[1]}`); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`dev engine exited ${code}: ${err}`)); });
  });
  return {
    engine: (opts = {}) => createDevEngine({ base: `${origin}/dev-engine`, ...opts }),
    stop: () => proc.kill(),
  };
}
