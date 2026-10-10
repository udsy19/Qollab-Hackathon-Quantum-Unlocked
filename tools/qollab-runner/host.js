// Host page: the runner's equivalent of Qollab's Code tab in Run mode. It owns
// the console and the job counter, and recreates the sandboxed project frame on
// every Run (Qollab keeps nothing between runs).
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get('backend')) $('backend').value = params.get('backend');

// Read by headless checks. Every field is written here, from frame events,
// never by the project code.
const state = (window.__runner = { status: 'idle', jobs: 0, refusedByRunner: 0, log: [], error: null });

function log(kind, msg) {
  state.log.push({ kind, msg });
  const line = document.createElement('div');
  line.className = kind;
  line.textContent = msg;
  $('console').appendChild(line);
  $('console').scrollTop = $('console').scrollHeight;
}

function setJobs() {
  const el = $('jobs');
  el.textContent = `backend.run calls: ${state.jobs}` + (state.refusedByRunner ? ` · REFUSED BY RUNNER: ${state.refusedByRunner}` : '');
  el.className = state.refusedByRunner ? 'red' : state.jobs > 1 ? 'warn' : '';
}

let frame = null;

function stop() {
  if (frame) frame.remove();
  frame = null;
  if (state.status === 'running' || state.status === 'loading') {
    state.status = 'stopped';
    log('system', 'Stopped.');
  }
}

async function run() {
  stop();
  Object.assign(state, { status: 'loading', jobs: 0, refusedByRunner: 0, log: [], error: null });
  $('console').textContent = '';
  setJobs();
  const project = await (await fetch('/project.json', { cache: 'no-store' })).json();
  $('problems').textContent = project.problems.join(' · ');
  for (const p of project.problems) log('err', `runner: ${p}`);
  log('runner', `runner: ${project.files.length} files in ${project.root}; backend = ${$('backend').value}`);
  frame = document.createElement('iframe');
  // No allow-same-origin: the frame's origin is "null", as Qollab's sandboxed
  // project frame is (runtime-environment § Network access), so localStorage,
  // sessionStorage, IndexedDB and cookies throw there just as they do on Qollab.
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.title = 'Project page';
  frame.src = `/frame.html?backend=${encodeURIComponent($('backend').value)}`;
  $('frame-wrap').appendChild(frame);
  const thisFrame = frame;
  window.onmessage = (ev) => {
    if (ev.source !== thisFrame.contentWindow) return;
    const m = ev.data || {};
    switch (m.event) {
      case 'ready':
        thisFrame.contentWindow.postMessage({ event: 'start', project }, '*');
        break;
      case 'out': case 'err': case 'system': case 'debug': case 'probabilities':
        log(m.event === 'out' || m.event === 'err' ? m.event : 'system', m.msg);
        break;
      case 'running':
        state.status = 'running';
        break;
      case 'job':
        state.jobs = m.count;
        if (m.refused) state.refusedByRunner += 1;
        log(m.refused ? 'err' : 'runner', m.msg);
        setJobs();
        break;
      case 'done':
        state.status = m.error ? 'error' : 'done';
        state.error = m.error || null;
        if (m.error) log('err', `Run stopped: ${m.error}`);
        break;
    }
  };
}

$('run').addEventListener('click', run);
$('stop').addEventListener('click', stop);
if (params.get('autorun') === '1') run();
