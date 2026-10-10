// DEV-ONLY. Never copy into echo/. The harness's QuantumEngine (vision §8.4): a GET client for
// dev/gameplay/dev_engine.py, which computes every result with real Qiskit in local CPython.
// Like the quantum lane's bridge, nothing unvalidated is handed on: every result passes
// validateExperimentResult or the call rejects (the UI shows an error, never invented numbers).
import { validateExperimentResult } from '../../echo/contracts.js';

export function createDevEngine({ base = '/dev-engine', delayMs = 0 } = {}) {
  let pendingFailure = null;
  let commitFault = false;

  async function call(name, args = {}) {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    // An injected failure rejects once and sends nothing, for the retry paths.
    if (pendingFailure) { const why = pendingFailure; pendingFailure = null; throw new Error(why); }
    const res = await fetch(`${base}/${name}?a=${encodeURIComponent(JSON.stringify(args))}`);
    const body = await res.json();
    if (!body.ok) throw new Error(`dev engine ${name}: ${body.error}`);
    const errors = validateExperimentResult(body.result);
    if (errors.length) throw new Error(`dev engine ${name}: result rejected by the contract: ${errors.join('; ')}`);
    return body.result;
  }

  return {
    cloneTest: (state) => call('cloneTest', { state }),
    bellSignalling: (senderGate) => call('bellSignalling', { senderGate }),
    // Teleport dry run, two phases (CONTRACTS.md § Teleport dry run): bits first, corrections second.
    teleportBits: ({ theta, phi }) => call('teleportBits', { theta, phi }),
    teleportCorrection: (req) => call('teleportCorrection', req),
    // The live commit as ONE atomic call (owner ruling, gameplay consult 3).
    commitStoryToken() {
      const fault = commitFault;
      commitFault = false;
      return call('commitStoryToken', { fault });
    },
    failNext: (reason = 'simulated quantum bridge failure') => { pendingFailure = reason; },
    faultNextCommit: () => { commitFault = true; },
  };
}
