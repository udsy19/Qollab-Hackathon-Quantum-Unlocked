// Project frame: a re-implementation of what Qollab's project frame does when a
// JS project runs. Every behaviour below names its source:
//   [doc:<page>]  https://qollab.xyz/learn/docs/<page>, read 2026-10-09
//   [rt]          Qollab's shipped runtime /_nuxt/jsworker-C6a5_czr.js and its
//                 compiler chunk /_nuxt/BWPMdZ7B.js, read (GET only) 2026-10-09
//   [net]         network log of a signed-out Built-in-simulator run, 2026-10-09
// Anything not marked is runner plumbing, not a claim about Qollab.
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs'; // [rt] line 1, [net]

const QISKIT_WHEEL = 'qiskit-2.5.2-cp310-abi3-pyemscripten_2026_0_wasm32.whl'; // [net]
const PROJECT_ROOT = '/home/pyodide/project';
const BACKEND_MODE = new URLSearchParams(location.search).get('backend') || 'builtin';

const host = window.parent;
const H = (msg) => host.postMessage(msg, '*');
window.parent = null; // [rt] the project sees parent === null

// ---- Sandbox restrictions -------------------------------------------------
// [rt] XMLHttpRequest is replaced by a class whose constructor throws.
window.XMLHttpRequest = class {
  constructor() {
    throw Error('XHR is not supported, please use fetch() API');
  }
};
// [doc:runtime-environment § Network access] every method except GET and
// OPTIONS fails with an error saying network access is restricted; WebSocket
// and web workers are not available. (Exact error text not observed.)
const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS')
    return Promise.reject(new TypeError(`Network access is restricted: ${method} is not allowed (local runner)`));
  return realFetch(input, init);
};
for (const name of ['WebSocket', 'Worker', 'SharedWorker']) {
  try {
    delete window[name];
    window[name] = undefined;
  } catch {}
}

// ---- Hooks Qollab's patched Qiskit wheel imports from `js` -----------------
// [net] the wheel's basic_simulator.py does `from js import reportCounts,
// reportNumQubits` and visualization does `from js import sendFile`; without
// these globals `import qiskit` fails. [rt Te()] they feed the run console's
// Probabilities panel, Circuit panel and file list.
window.signalRunning = () => H({ event: 'system', msg: 'Running...' });
window.reportCounts = (counts) => {
  if (!counts || typeof counts.toJs !== 'function') return;
  const c = counts.toJs({ dict_converter: Object.fromEntries });
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const probs = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v / total]));
  H({ event: 'probabilities', msg: `Probabilities panel: ${JSON.stringify(probs)}` });
};
window.reportNumQubits = (n) => H({ event: 'debug', msg: `Circuit panel: ${n} qubits` });
window.sendFile = (name, type) => H({ event: 'out', msg: `[file] ${String(name)} (${type})` });

// ---- Python preamble [rt] (ke + Ae + je + Me[""] + Ne default) -------------
const PREAMBLE = `import warnings

warnings.filterwarnings(
    "ignore",
    message="The [xy] parameter as float was deprecated",
    category=DeprecationWarning,
)
import os

os.environ['QISKIT_PARALLEL'] = 'FALSE'
os.environ['RAYON_NUM_THREADS'] = '1'
import concurrent.futures

class MainThreadExecutor(concurrent.futures.Executor):
	def __init__(self, *args, **kwargs):
		super().__init__()

	def submit(self, fn, /, *args, **kwargs):
		f = concurrent.futures.Future()
		try:
			result = fn(*args, **kwargs)
		except BaseException as e:
			f.set_exception(e)
		else:
			f.set_result(result)
		return f

	def shutdown(self, wait=True, *, cancel_futures=False):
		pass

	def __enter__(self):
		return self

	def __exit__(self, exc_type, exc, tb):
		self.shutdown()

import concurrent.futures.thread
concurrent.futures.thread.ThreadPoolExecutor = MainThreadExecutor
concurrent.futures.ThreadPoolExecutor = MainThreadExecutor

del MainThreadExecutor
from qiskit.providers.basic_provider import BasicSimulator
backend = BasicSimulator()
backend`;

// [rt] the IonQ path refuses a second job POST with exactly this message.
const ONE_JOB_MESSAGE = 'The code has already filed one circuit execution job; only one job is allowed per code run';

// ---- JS compile step [rt BWPMdZ7B.js pl()] ---------------------------------
const PREFIX = '//PREFIX\n';
function compile(src, file) {
  const out = window.Babel.transform(PREFIX + src, {
    sourceType: 'module',
    plugins: [['transform-modules-commonjs', { importInterop: 'none' }]],
    sourceFileName: file,
  });
  let js = (out.code ?? '').replace(/^"use strict";\n\n/s, '');
  const at = js.indexOf(PREFIX);
  const cut = at < 0 ? js.length : at;
  // Only the hoisted import requires (before the marker) become awaited.
  js = js.substring(0, cut).replace(/\brequire\s*\(/g, 'await require(') + js.substring(at < 0 ? cut : cut + PREFIX.length);
  return js;
}

// ---- console [rt] ----------------------------------------------------------
// Each argument prints on its own line as text [doc:runtime-environment § HTML and CSS].
const emit = (event) => (...args) => {
  for (const a of args) H({ event, msg: String(a) });
};
const projectConsole = { log: emit('out'), info: emit('out'), warn: emit('out'), error: emit('err'), debug: emit('debug'), clear() {} };

// [rt] the injected setTimeout is async: with a function it schedules it, with a
// number it returns a promise that resolves after that many ms.
const injectedSetTimeout = async function (fn, ms) {
  return typeof fn === 'function' ? window.setTimeout(fn, ms) : new Promise((r) => injectedSetTimeout(r, fn));
};

// ---- backend proxy [rt ft()] + runner job counter --------------------------
let jobCount = 0;
function wrapBackend(pyBackend) {
  return new Proxy(pyBackend, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (key !== 'run') return value;
      return async function (...args) {
        jobCount += 1;
        if (BACKEND_MODE === 'ionq-mock' && jobCount > 1) {
          H({ event: 'job', count: jobCount, refused: true, msg: `runner: REFUSED backend.run #${jobCount} (IonQ one-job mock): ${ONE_JOB_MESSAGE}` });
          throw new Error(ONE_JOB_MESSAGE);
        }
        H({
          event: 'job',
          count: jobCount,
          refused: false,
          msg: `runner: backend.run #${jobCount} on ${BACKEND_MODE === 'ionq-mock' ? 'IonQ one-job mock (BasicSimulator)' : 'BasicSimulator'}` +
            (jobCount > 1 ? ' — would be REFUSED on any IonQ backend' : ''),
        });
        const job = await value.callPromisingKwargs(...args);
        return new Proxy(job, {
          get(t, k, r) {
            const v = Reflect.get(t, k, r);
            if (k === 'status') return async () => (await v.callPromising()).toString();
            if (k === 'result') return async () => v.callPromising();
            return v;
          },
        });
      };
    },
  });
}

// [rt ot()] JobStatus members are stringified when imported from JS.
function wrapJobStatus(mod) {
  return new Proxy(mod, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (k !== 'JobStatus') return v;
      return new Proxy(v, { get: (a, b, c) => { const x = Reflect.get(a, b, c); return typeof x === 'object' ? x.toString() : x; } });
    },
  });
}

// ---- bare-specifier fallback [rt dt() + ut()] ------------------------------
const dynamicImport = Function('u', 'return import(u)');
const pyImportCode = (name) => `import ${name} as m
if getattr(m, "__file__", None) is None and all((path + "/").startswith(${JSON.stringify(PROJECT_ROOT + '/')}) for path in getattr(m, "__path__", None) or ("",)) and not any(
    name.endswith(".py") for path in m.__path__ for _, _, names in __import__("os").walk(path) for name in names
):
    raise ModuleNotFoundError(${JSON.stringify(`No module named '${name}'`)}, name=${JSON.stringify(name)})
m`;
async function bareImport(py, name) {
  // [rt] Qollab bundles these two; their versions are not visible, so the
  // runner takes jsdelivr's latest (deviation, documented in README).
  if (name === '@tweenjs/tween.js') return dynamicImport('https://cdn.jsdelivr.net/npm/@tweenjs/tween.js/+esm');
  if (name === 'meshline') return dynamicImport('https://cdn.jsdelivr.net/npm/meshline/+esm');
  if (!/^[\w\d@_.-]+$/.test(name)) return dynamicImport(name);
  if (!/^https:\/\//i.test(name)) {
    try {
      const m = await py.runPythonAsync(pyImportCode(name));
      return name === 'qiskit.providers.jobstatus' ? wrapJobStatus(m) : m;
    } catch (e) {
      if (e.name !== 'PythonError' || e.type !== 'ModuleNotFoundError') throw e;
    }
  }
  return dynamicImport(name);
}

// ---- relative JS modules [rt xt() + bt()] ----------------------------------
function resolveRelative(spec, from, paths) {
  const parts = from.includes('/') ? from.slice(0, from.lastIndexOf('/')).split('/') : [];
  for (const seg of spec.split('/')) {
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  const r = parts.join('/');
  const dir = r ? `${r}/` : '';
  return [r, `${r}.js`, `${r}.mjs`, `${dir}index.js`, `${dir}index.mjs`].find((p) => paths.has(p)) ?? null;
}

function makeRequire({ paths, text, evaluate, fallback }) {
  const modules = new Map();
  const requireFrom = (from, chain) => async (spec) => {
    if (!/^\.\.?(?:\/|$)/.test(spec)) return fallback(spec);
    const p = resolveRelative(spec, from, paths);
    if (p === null) throw Error(`Cannot find module '${spec}' imported from ${from}`);
    if (!/\.m?js$/.test(p)) throw Error(`Cannot import ${p} from ${from}: only .js and .mjs files can be imported`);
    const known = modules.get(p);
    if (known) return chain.has(p) ? known.module.exports : known.ready;
    const module = { exports: {} };
    const ready = (async () => {
      await evaluate(compile(text[p], p), p, module.exports, module, requireFrom(p, new Set(chain).add(p)));
      return module.exports;
    })();
    modules.set(p, { module, ready });
    return ready;
  };
  return requireFrom('main.js', new Set(['main.js']));
}

// ---- data files [doc:runtime-environment § Data files] ---------------------
// Only files whose path appears as a plain string literal in the Python code are
// loaded. Approximation: a quoted occurrence of the relative path anywhere in
// any .py file.
function namedDataFiles(project) {
  const pySrc = Object.entries(project.text).filter(([p]) => p.endsWith('.py')).map(([, s]) => s).join('\n');
  return project.files
    .map((f) => f.path)
    .filter((p) => !p.endsWith('.py') && !/\.(m?js|html|css)$/.test(p) && (pySrc.includes(`"${p}"`) || pySrc.includes(`'${p}'`)));
}

async function start(project) {
  const AsyncFunction = async function () {}.constructor;
  let py;
  try {
    H({ event: 'system', msg: 'Loading packages...' });
    py = await loadPyodide(); // [rt] called with no options
    py.setStdin({ error: true }); // [rt] input() does not work
    py.setStdout({ batched: (s) => H({ event: 'out', msg: s }) });
    py.setStderr({ batched: (s) => H({ event: 'err', msg: s }) });
    await py.loadPackage('micropip');
    const micropip = py.pyimport('micropip');
    // [net][rt] Qollab installs qiskit from its own /py index with pre=True; the
    // runner serves the same wheel file from its cache.
    await micropip.install.callKwargs(new URL(`/py/${QISKIT_WHEEL}`, location.href).href, { pre: true });
    const reqs = (project.text['requirements.txt'] || '')
      .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)
      .filter((l) => !/^qiskit(\s|[<>=!~]|$)/i.test(l)); // the cached wheel is the Qiskit line
    if (reqs.length) await micropip.install.callKwargs(reqs, { pre: true });

    H({ event: 'system', msg: 'Loading project files...' });
    py.FS.mkdirTree(PROJECT_ROOT);
    const writeFile = (rel, data) => {
      const abs = `${PROJECT_ROOT}/${rel}`;
      py.FS.mkdirTree(abs.slice(0, abs.lastIndexOf('/')));
      py.FS.writeFile(abs, data);
    };
    for (const [p, src] of Object.entries(project.text)) if (p.endsWith('.py')) writeFile(p, src);
    for (const p of namedDataFiles(project)) if (project.text[p] !== undefined) writeFile(p, project.text[p]);
    // [doc:runtime-environment § Importing your own files] the project root is
    // the working directory and the first entry on sys.path.
    py.runPython(`import os, sys\nos.chdir(${JSON.stringify(PROJECT_ROOT)})\nsys.path.insert(0, ${JSON.stringify(PROJECT_ROOT)})`);
    const pySources = Object.entries(project.text).filter(([p]) => p.endsWith('.py')).map(([, s]) => s).join('\n');
    await py.loadPackagesFromImports(pySources);

    H({ event: 'system', msg: 'Compiling / initializing runtime...' });
    // [doc:runtime-environment § HTML and CSS] html/head/body tags are dropped and
    // index.html is body content; [rt] it is appended with innerHTML, so <script>
    // never runs. main.css is the only stylesheet.
    const html = (project.text['index.html'] || '').replace(/<\/?(html|head|body)\b[^>]*>/gi, '');
    document.body.innerHTML += html;
    if (project.text['main.css'] !== undefined) {
      const style = document.createElement('style');
      style.textContent = project.text['main.css'];
      document.head.appendChild(style);
    }
    const names = ['console', 'parent', 'setTimeout', 'require', 'backend', 'exports', 'module'];
    const mainFn = new AsyncFunction(...names, compile(project.text['main.js'], 'main.js'));
    const backend = wrapBackend(await py.runPythonAsync(PREAMBLE));
    document.querySelector('.qollab-loading-overlay')?.remove();
    H({ event: 'system', msg: 'Running...' });
    H({ event: 'running' });
    const entry = { exports: {} };
    const require = makeRequire({
      paths: new Set(project.files.map((f) => f.path)),
      text: project.text,
      evaluate: (js, file, exports, module, req) =>
        new AsyncFunction(...names, `${js}\n//# sourceURL=${file}`)(projectConsole, null, injectedSetTimeout, req, backend, exports, module),
      fallback: (name) => bareImport(py, name),
    });
    await mainFn(projectConsole, null, injectedSetTimeout, require, backend, entry.exports, entry);
    H({ event: 'system', msg: 'Done.' });
    H({ event: 'done' });
  } catch (err) {
    document.querySelector('.qollab-loading-overlay')?.remove();
    H({ event: 'done', error: String(err && err.message ? err.message : err) });
  }
}

window.addEventListener('message', (ev) => {
  if (ev.data?.event === 'start') start(ev.data.project);
});
H({ event: 'ready' });
