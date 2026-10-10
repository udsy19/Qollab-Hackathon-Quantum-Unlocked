// Shared by seam.mjs and guard.mjs: load gameplay's quest code beside a chosen contracts.js, the
// names-only rename shim, and driving a fresh machine to a quest state along the §9.2 path.
import { readFileSync, writeFileSync, mkdirSync, cpSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

// `edits` = [[file relative to echo/, from, to]]: a sabotage applied to the DISPOSABLE copy only
// (law 10). An edit whose `from` is absent throws, so a sabotage can never silently not happen.
export async function load(gameplayDir, contractsPath, label, edits = []) {
  const dir = mkdtempSync(join(tmpdir(), `seam-${label}-`));
  cpSync(join(gameplayDir, 'echo/game'), join(dir, 'echo/game'), { recursive: true });
  cpSync(contractsPath, join(dir, 'echo/contracts.js'));
  for (const [file, from, to] of edits) {
    const p = join(dir, 'echo', file);
    const src = readFileSync(p, 'utf8');
    if (!src.includes(from)) throw new Error(`sabotage ${label}: ${JSON.stringify(from)} not found in ${file}`);
    writeFileSync(p, src.replace(from, to));
  }
  const url = (f) => pathToFileURL(join(dir, 'echo', f)).href;
  return {
    label,
    contracts: await import(url('contracts.js')),
    state: await import(url('game/state.js')),
    rules: await import(url('game/missionRules.js')),
  };
}

export const readRows = (path) => readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

// Names only. Every value comes from the engine's own result (commit: the bits the engine measured,
// and the rule its circuitDescription says it applied).
export function rename(row) {
  const r = structuredClone(row.result);
  const p = r.parameters;
  if (row.mission === 'cloning' && r.observables?.jointFidelityWithTwoCopies !== undefined) r.fidelity = r.observables.jointFidelityWithTwoCopies;
  if ('applyX' in p) p.correctionX = p.applyX;
  if ('applyZ' in p) p.correctionZ = p.applyZ;
  if ('state' in p) p.stateId = p.state;
  if (row.mission === 'commit') {
    p.stateId = 'story_token';
    p.correctionX = r.measurementBits.m1 === 1;
    p.correctionZ = r.measurementBits.m0 === 1;
  }
  return r;
}

// Canonical §9.2 path; acknowledgements are sent after resultPanelShown() (owner ruling 13).
export const PATH = ['BOOT_COMPLETE', 'START', 'SKIP', 'OPEN_CLONE_BOOTH', 'BASIS_DEMO_OK', 'SUPERPOSITION_DEMO_FAILED',
  'EXPLANATION_READ', 'EXIT_BOOTH', 'REACH_RELAY', 'PREPARE_BELL_PAIR', 'ATTEMPT_NO_SIGNALLING',
  'VIEW_RECEIVER_MARGINAL', 'OPEN_ROOFTOP', 'REPAIR_CLASSICAL_LINK', 'RUN_DRY_TEST', 'CORRECT_CALIBRATION'];
export const ACK = new Set(['EXPLANATION_READ', 'VIEW_RECEIVER_MARGINAL']);
export const bus = { emit() {}, on() { return () => {}; } };

export function machineAt(G, target) {
  const m = G.state.createQuestMachine(bus);
  for (const ev of PATH) {
    if (m.state === target) break;
    if (ACK.has(ev)) m.resultPanelShown();
    const r = m.send(ev);
    if (!r.ok) throw new Error(`driving to ${target}: ${ev} refused in ${m.state}: ${r.reason}`);
  }
  if (m.state !== target) throw new Error(`could not drive to ${target}, stopped in ${m.state}`);
  return m;
}

