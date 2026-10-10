=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`). It renders Three.js, calls a Qiskit module through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. Alongside it: a local Qollab-like runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts, integrates every lane after each merge, runs full playthroughs, keeps `echo/` within Qollab's caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Fri 23:30. G0 is overdue. G1 Sat 04:00 · G2 Sat 17:00 · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- `shared-contracts`, judged and merged this consult.
  - `echo/contracts.js` holds the frozen §9.1 states, the §9.2 transitions (+2 edges), `transition()`, `BUS_EVENTS`, `WORLD_CHANGES`, the interactable bindings and `validateExperimentResult()`. `echo/CONTRACTS.md` is the quantum lane's dict shape.
  - Evidence: a headless Chrome screenshot shows the full happy path BOOT→CREDITS, a refused double-commit, a loud throw on a misspelt name, and the validator rejecting a Map and counts-under-exact.
  - Check results: red→green 604/604; sabotage 18 red with 3 named nulls.
  - Owner questions Q1–Q6 are raised below. Q7 (location) is already settled by the owner: `echo/contracts.js`.

**In flight:** `g0-runner-smoke`.
- Key finding at its checkpoint: Qollab's real runtime is Pyodide v314.0.7 plus Qollab's own Qiskit 2.5.2 wasm wheel. `main.js` is compiled with Babel CommonJS and runs as an `AsyncFunction(console, parent, setTimeout, require, backend, exports, module)`. Bare imports resolve to Python first. The one-job guard message is known.
- The runner will copy this with real Pyodide, so no CPython bridge should be needed.
- Its final report must also confirm that `import './contracts.js'` and `toJs({dict_converter: Object.fromEntries})` work on the runner.

**Next:**
1. `echo-caps-gate` (dispatched now): a red-first gate for Qollab's static rules over `echo/`. It checks ≤100 files and ≤2 MB each, and flags forbidden APIs: storage, POST/PUT/DELETE, WebSocket, Worker, `<script>` in `index.html`, a bare import that is not in the importmap, and more than one `backend.run` call site. Plan row 7.
2. When G0 lands:
   - merge it;
   - the overseer runs the smoke test on Qollab (one draft, built-in simulator);
   - the result is recorded in owner-answers. Only that closes row 3.
3. Integration shell:
   - `main.js` boots gameplay, scene, ui and quantum against `contracts.js`, starting with an empty-room playable shell;
   - `main.js` must use the runner's import mechanics exactly.
4. Cross-lane, through the overseer:
   - gameplay (`gameplay-quest-core`) must import from `echo/contracts.js` and must NOT write a second transition table in `game/state.js`;
   - quantum builds `formats.py` to `echo/CONTRACTS.md` § ExperimentResult;
   - story-ui uses the same field names.
5. Later: README as the Qollab write-up, the video script, three consecutive full runs (row 8).

**Risks:**
- A duplicate state table from gameplay running in parallel (raised with the overseer).
- Qiskit-in-Pyodide copied incorrectly locally. Mitigated: the real wheel is used.
- The owner's answers to Q1–Q6 may reshape the contract. Each change is small and gated by `check.mjs`.
- Null: §9.3 world-change ids are not pinned by any independent source. Accepted until the owner answers Q5.
=== END PLAN ===

=== MERGE branch=lane/platform/shared-contracts ===

=== AGENT name=echo-caps-gate model=sonnet base=lane/platform/integration ===
**GOAL:** Before anything is uploaded, the owner (and every lane after every merge) can run one command that says whether `echo/` would break on Qollab's static rules. It must be loud and specific about which file and line breaks which rule.

**VISION:** ECHO must run on Qollab as uploaded (`.claude/rules/qollab-runtime.md`, `QOLLAB_DEPLOYMENT.md`). The owner judges the Qollab run. A broken upload costs an owner session we cannot spare before the Sun 19:00 ET deadline.

**WHAT WE ARE BUILDING:** `tools/qollab-caps/check.mjs`, a Node script outside `echo/` that is never shipped. It reads `echo/` from disk (or from `--root <dir>`) and checks, with exit codes 0 green · 1 red · 2 refused:
1. At most 100 files under `echo/`, counted recursively, hidden files included.
2. Each file at most 2 MB, in bytes.
3. `echo/index.html` is a body fragment: no `<html>`, `<head>` or `<body>`, and no `<script>` (scripts there do not run on Qollab).
4. `echo/main.js` exists.
5. No storage: `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`.
6. No non-GET network: `method: 'POST'|'PUT'|'DELETE'|'PATCH'` in fetch, `XMLHttpRequest` open with those, `navigator.sendBeacon`. Also no `WebSocket`, `EventSource`, `new Worker`, `SharedWorker` or `serviceWorker`.
7. Every bare JS import specifier is one of `three`, `three/addons/...` or `postprocessing`, a relative path, a full https URL, or a Python module that exists as `echo/<dotted path>.py`.
8. At most one `backend.run` call site across `echo/**/*.js`. Python files may not call `backend.run` themselves unless the owner rules otherwise; list any you find.
9. No hardcoded backend names or keys (`IonQ`, `api_key`, `token=`) in code; doc files are excluded.

Each failure prints `file:line rule-id message`.

**WHAT HAS NOT WORKED / pitfalls:**
- A gate that cannot fail. Write the check first and run it against fixtures that break each rule (under `tools/qollab-caps/fixtures/`). Watch every rule go red, then run it on the real `echo/`.
- Regex false positives in comments and strings: report them honestly and do not silently skip. A rule you cannot implement soundly is reported as a named limitation, not a pass.
- Zero files scanned is exit 2, never green.
- Do not edit anything inside `echo/`. If the real `echo/` fails, report it and do not fix it.

**Vault notes to read first:**
- `vault/AGENTS.md`;
- `vault/Index.md`;
- `vault/Research/qollab-platform-and-submission.md` (measured runtime facts: importmap, the `<script>` rule, the one-job guard);
- `.claude/rules/gate-independence.md` and `vault/Design/gate-independence-cases.md`;
- `QOLLAB_DEPLOYMENT.md`.

Run `node scripts/where.mjs caps --branches` and `git grep -n "100 files"` before writing anything: a caps check may already exist in `scripts/gates/`.

**Deliver:**
- the script;
- fixtures (one per rule, plus one clean);
- a sabotage round on a disposable copy: disable each rule in turn and show the fixture stays green; report the nulls;
- its output on the current `echo/` (the merged contracts; G0 files once they land);
- `vault/Reports/qollab-caps-gate.md`, linked via `node scripts/vault-hubs.mjs`.

Commit to `lane/platform/echo-caps-gate`.

**How I will judge it:**
- the red-fixture logs with exit codes;
- the sabotage table with its nulls;
- the real-tree run.

Claims without logs are refused.

**Report:** `/Users/udsy/agent-org/lanes/platform/reports/0002-echo-caps-gate.md`. It opens with a Vault check, then TL;DR, commands + exit codes + log paths, nulls, and Questions for the owner. Write a checkpoint within 1 h.
=== END AGENT ===

=== ASK_OWNER ===
Shared contracts are merged into platform integration (`echo/contracts.js`, `echo/CONTRACTS.md`). Proof: [contracts-browser-load.png](renders/shared-contracts/contracts-browser-load.png). Building it surfaced six choices the vision docs do not settle. The worker used the defaults below; each is cheap to change.

1. **Two missing state edges.** May the machine add `BOOT —BOOT_COMPLETE→ TITLE` and `DECLASSIFIED —OPEN_CREDITS→ CREDITS`? Without them, §9.2 never starts and dead-ends at DECLASSIFIED. Should DECLASSIFIED also be able to go back to ENDING?
2. **Two extra ExperimentResult fields.** May it gain `keyQubits` (which qubit each bitstring character is: the §7.1 bit-order guard) and `observables` (exact numbers such as purity, for §7.2's Declassified view)? The alternative is to put purity in `parameters` and fix bit order by convention.
3. **Counts in previews.** Should `documented_preview` results be forbidden from carrying `counts`, so a preview can never look like a fresh measurement? It is currently allowed.
4. **The selected-backend job's experiment name.** The §10.7 job is a Bell-correlation run. Should its `experiment` be `bell_signalling` (current default) or a new `backend_verification`?
5. **Added names.** Are the added bus events `QUEST_STATE_CHANGED` and `CLOSE_TERMINAL`, and the snake_case world-change ids (e.g. `corridor_door_opens`), acceptable?
6. **The rooftop console.** Is its id `teleport_terminal`? And who fires `OPEN_ROOFTOP`, `EXIT_BOOTH`, `EXPLANATION_READ` and `VIEW_RECEIVER_MARGINAL`: a world trigger (gameplay lane) or the terminal UI (story-ui lane)?

For the overseer (no owner decision needed):
- Please tell the gameplay lane (`gameplay-quest-core`) to import its states, transitions and events from `echo/contracts.js`, not to define its own table.
- Please point the quantum and story-ui lanes at `echo/CONTRACTS.md`.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 2: I merged `shared-contracts` on screenshot evidence. That evidence was a headless Chrome load with the served sha256 matching the file, red→green 604/604, and 18 of 21 sabotage cases red with 3 named nulls.

The §9.2 table in the vision is incomplete:
- BOOT has no outgoing edge;
- DECLASSIFIED is a dead end;
- the §10.3 sample output does not fit §8.4.

Treat the vision's code samples as illustrative. Contracts are derived from the vision's text and flows, and every deviation becomes an owner question.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 2: G0 checkpoint finding (to verify in its final report):
- Qollab runs Pyodide v314.0.7 with its own Qiskit 2.5.2 wasm wheel from `qollab.xyz/py/`.
- `main.js` is compiled by Babel to CommonJS and run as `AsyncFunction(console, parent, setTimeout, require, backend, exports, module)`.
- Bare imports resolve to Python first.

Every lane's JS must survive the CommonJS transform: no top-level `import.meta` and no dynamic tricks. The integration shell and the caps gate must respect this.
=== END LEARN ===
