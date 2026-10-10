# 0001 — shared-contracts (platform, consult 1): FINAL

## TL;DR
- **Done and verified.** `echo/contracts.js` is one frozen, platform-owned ES module. It holds the §9.1 states, the §9.2 transitions plus 2 added edges, `transition()`, bus and §9.3 world-change names, the §9.4 interactable bindings plus `teleport_terminal`, and `validateExperimentResult()`. A misspelt name **throws**. A right name at the wrong time is **refused** with `{ok:false}` and the state unchanged.
- `echo/CONTRACTS.md` gives the quantum lane the exact dict shape. As a test, I built three results from real Qiskit 2.5 by following only that doc, and all three validate clean.
- Red→green: module absent → exit 1. The vision's own §9.2 sample as a stub → exit 1 with 125 FAILs. Real module → **exit 0, 604/604**.
- Sabotage (21 mutations on a disposable copy): **18 red and 3 declared nulls**. The three asked for (delete a transition, misspell a state, flip the tolerance either way) are all red.
- Browser: `renders/shared-contracts/contracts-browser-load.png` (headless Chrome 155). The served-bytes sha256 `8052cf29…` matches `shasum` of the file.
- Commits: `9de1c10`, `cf15e81` on `lane/platform/shared-contracts`. Ready to merge to platform integration.
- **Recommend:** land this before gameplay-quest-core writes `echo/game/state.js`, and tell that worker to import from `contracts.js` and not define its own tables (see Next).
- 7 owner questions below. Two of them (`keyQubits`, `observables`) are fields I added to §8.4.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Map-code.md`, `vault/Research/qollab-platform-and-submission.md`, `vault/Design/lanes-and-supervisors.md` (§ Where research findings go), `vault/CLAUDE.md`, lane `context.md`. Vision §3.2–3.4, §4, §6.4–6.6, §7, §8.2–8.7, §9 (all of it), §10.1–10.8, §12.3–12.4.
- **Already known:** nothing on ECHO contracts. `where.mjs ExperimentResult --branches` found only the vision/roadmap/rules text. `where.mjs` returned exit 1 (a true negative) for `validateExperimentResult`, `INTERACTABLE_IDS`, `WORLD_CHANGES` and `BUS_EVENTS`. `git grep "QUEST_STATES\|transition("` found only vision line 770. No lane branch carries commits beyond main, and no worktree has uncommitted work as of 23:10 ET.
- **Reused:** the §9.2 table and the §10.6 bit convention verbatim. Facts from the research note: no `<script>` in index.html, and Python reached via `callPromising`.
- **Stale or wrong:** `vault/Map-code.md`'s area table has a malformed row: the `echo/` row is glued after `evidence/` with a leading `| |`, and the trailing template row is merged into the `echo/tests/` line. It also has no row for `tools/`. I did not edit it (it is a hand-kept map; the supervisor or overseer should decide). The context.md "Facts that bite" say JS cannot read project files. That is about data files: the Qollab docs say `main.js` "can import your other JavaScript files with `./` paths" (fetched https://qollab.xyz/learn/docs/js-qiskit-projects).
- **Written back:** `vault/Reports/shared-contracts.md` (measured findings). Hubs and Map were not committed, per the brief; `vault-hubs --check` lists `Reports/README.md` and `Map.md` as stale for the loop to regenerate.

## What I found
1. **§9.2 has 20 edges across 18 rows.** My check refused at first because I had hand-counted 19, so the parser guard demonstrably bites before any comparison runs.
2. **The §9.2 sample is incomplete against §9.1 and §3.4.** BOOT has no outgoing edge, so it is unreachable as a starting state, and DECLASSIFIED is a dead end. I added `BOOT -BOOT_COMPLETE→ TITLE` and `DECLASSIFIED -OPEN_CREDITS→ CREDITS`, both from the §3.4 flow.
3. **§8.4's ExperimentResult has no place for two things the vision requires:**
   - reduced-state purity (§7.2: "In Declassified show the reduced-state purity"). I added optional `observables: {str: number}`;
   - an explicit bit order for probability and count keys (§7.1: "Never parse raw bitstrings without an explicit register mapping"). I added `keyQubits`, required whenever `probabilities` or `counts` is present. For example, Qiskit's `probabilities_dict()` on 2 qubits gives `[1,0]`.
4. **The §10.3 reference output does not fit §8.4.** It uses `circuit`, `outputPurity0` and `isIndependentCloning`, and the validator rejects unknown keys. CONTRACTS.md maps each of these onto the §8.4 fields.
5. **Pyodide's plain `toJs()` returns a `Map` for a dict.** The validator rejects a Map by name and suggests `toJs({dict_converter: Object.fromEntries})`. This has not been confirmed on Qollab's own Pyodide yet.
6. **Collision risk:** worker `gameplay-quest-core` is running in parallel. Vision §8.2 puts the state machine in `echo/game/state.js`, so it may well be writing its own transition table right now.

## Decisions I made that the vision did not settle (each is an owner question below)
- D1: the two added edges (BOOT→TITLE as `BOOT_COMPLETE`, DECLASSIFIED→CREDITS reusing `OPEN_CREDITS`).
- D2: added bus events `QUEST_STATE_CHANGED {from,to,event}` (§9.3 consequences hang off it) and `CLOSE_TERMINAL {id}` (§6.6 Escape back-out). `OPEN_TERMINAL {id}` is §8.7 verbatim.
- D3: `WORLD_CHANGES` ids are snake_case renderings of the §9.3 prose, e.g. `corridor_door_opens`.
- D4: interactable `teleport_terminal` (requires LINK_REPAIRED, fires RUN_DRY_TEST). The "clone booth" is §9.4's `copy_booth`, not a separate id.
- D5: added `keyQubits` and `observables` to ExperimentResult (finding 3).
- D6: validator rules beyond the brief:
  - `qollab_selected_backend` must carry `counts` and must not carry `probabilities` (the mirror of the brief's rule);
  - unknown fields are rejected;
  - `facts` must be non-empty;
  - `fidelity` must be in [0, 1+1e-9];
  - `parameters` must be flat.
- D7: `CREDITS` is terminal; restart is `resetGame()` (§9.5), owned by gameplay. Retries (wrong corrections, the "increase voltage" choice, hints) stay in the same state and are not transitions.

## What I changed (commits on `lane/platform/shared-contracts`)
- `9de1c10`: `echo/contracts.js`, `tools/contract-check/check.mjs`, `fixtures.json` (5 good, 23 bad), `sabotage.py`.
- `cf15e81`: `echo/CONTRACTS.md`, `tools/contract-check/browser.html`, `vault/Reports/shared-contracts.md`.

## Commands and exit codes
| command | exit | log |
|---|---|---|
| `node tools/contract-check/check.mjs` (before the module existed) | 1 | `renders/shared-contracts/01-red-module-absent.log` |
| `… --contracts /tmp/sc-stub/contracts.js` (the vision's §9.2 code verbatim) | 1 (125 FAIL) | `02-red-vision-sample-stub.log` |
| `node tools/contract-check/check.mjs` | 0 (604/604) | `03-green.log` |
| `python3 tools/contract-check/sabotage.py` | 0 (21 cases, 0 mismatches) | `04-sabotage.log` |
| real Qiskit 2.5 → JSON → validator (cloning plus, bell X marginal, teleport θ=1.137 φ=0.44) | 0 (all `[]`) | `05-qiskit-shaped-results.json` |
| headless Chrome → `tools/contract-check/browser.html` on port 47311 | screenshot written | `contracts-browser-load.png` |
| `node scripts/gates/sprawl.mjs --base 163ca42 --tip HEAD` | 0 | (stdout) |

(All log paths are under `/Users/udsy/agent-org/lanes/platform/renders/shared-contracts/`.)

### Sabotage results
**Went red (18):**
- deleted transition: 32 FAIL lines;
- misspelt state: 3;
- tolerance loosened to 1e-6: 1;
- tolerance tightened to 1e-12: 1;
- strict tables stop throwing: 6;
- `transition()` accepts unknown events: 2;
- a refusal resets the state: 400;
- an unexplained extra edge: 1;
- deleted DECLASSIFIED→CREDITS: 3;
- double commit allowed: 2;
- counts allowed under exact: 1;
- probabilities allowed under backend: 1;
- measurementBits unchecked: 3;
- unknown fields accepted: 1;
- keys not checked against keyQubits: 1;
- fidelity upper bound removed: 1;
- empty facts accepted: 1;
- `copy_booth` rebound away from §9.4: 1.

**Nulls (did NOT go red; known blind spots):**
- renaming a §9.3 world-change id: nothing independent pins the ids, because §9.3 is prose;
- rebinding the added `teleport_terminal` to another *valid* pair: §9.4 does not name it, so only validity is checked;
- removing the Map-specific hint text: the generic error still says "a Map object", so the check still passes. The guidance text is not protected.

**Enabling step:** the vision parser's own guards (21 states, 20 edges, 3 interactables) refuse with exit 2 when they mismatch. This happened for real once (finding 1). I did not run a separate sabotage of the vision text, because that file is protected and the check reads it from the repo root.

## Evidence paths
- `/Users/udsy/agent-org/lanes/platform/renders/shared-contracts/contracts-browser-load.png`
- `/Users/udsy/agent-org/lanes/platform/renders/shared-contracts/0{1..5}-*`
- `echo/contracts.js`, `echo/CONTRACTS.md`, `tools/contract-check/`

## What I did NOT do or could not verify
- **Not run on Qollab.** I ran nothing on Qollab, and the owner has not. Importing `./contracts.js` from `main.js` is documented by Qollab but not observed. Plain `toJs()` returning a Map on Qollab's Pyodide is unverified. G0 (`g0-runner-smoke`) should import `contracts.js` and print one `validateExperimentResult` on a real `callPromising` result.
- **No numpy-proxy check.** I did not test a numpy-proxy value crossing a real Pyodide bridge. The claim in CONTRACTS.md that `np.int64` arrives as a proxy is Pyodide behaviour from memory, not measured here.
- **No event bus or `resetGame`.** I did not write either; both belong to gameplay. Contracts only names them.
- **No Map-code edit.** I did not edit `vault/Map-code.md` to fix its malformed row or add `tools/`.
- **No `formats.py`.** Writing it is the quantum lane's job.

## Questions for the owner
1. **Q1 (D1):** May the state machine add `BOOT -BOOT_COMPLETE→ TITLE` and `DECLASSIFIED -OPEN_CREDITS→ CREDITS`? §9.2's sample cannot reach BOOT and never leaves DECLASSIFIED; §3.4's flow requires both. Should DECLASSIFIED also return to ENDING?
2. **Q2 (D5):** May ExperimentResult gain two fields?
   - `keyQubits`: the qubit index of each bitstring character, which is the §7.1 endianness guard;
   - `observables`: exact derived numbers such as purity, for §7.2's Declassified view.

   Or would you rather purity live in `parameters` and the bit order be fixed by convention?
3. **Q3 (D6):** Should the validator also refuse `counts` under `documented_preview`? A preview showing counts can read as a fresh measurement (§8.4: "Never label preview data as a fresh … measurement"). It is currently allowed.
4. **Q4:** Which `experiment` value does the one selected-backend job carry? §10.7 runs a Bell-correlation circuit, but the §8.4 enum only has `cloning | bell_signalling | teleportation`. I used `bell_signalling` in fixtures. Should there be a fourth value such as `backend_verification`?
5. **Q5 (D2, D3):** Are the added bus events `QUEST_STATE_CHANGED` and `CLOSE_TERMINAL`, and the snake_case `WORLD_CHANGES` ids, acceptable names?
6. **Q6 (D4):** Is the rooftop console's interactable id `teleport_terminal`? And what fires `OPEN_ROOFTOP`, `EXIT_BOOTH`, `EXPLANATION_READ` and `VIEW_RECEIVER_MARGINAL`: a world trigger (door, exit volume) or the terminal UI? The vision does not say, and gameplay and story-ui both need to know who owns each one.
7. **Q7:** Should `echo/contracts.js` stay at the `echo/` root? This location is the provisional question the brief mentions.

## What the supervisor should do next
1. **Merge `lane/platform/shared-contracts` into platform integration now.** Then tell `gameplay-quest-core` through its brief or `owner-answers.md`: import `QUEST_STATES`, `QUEST_EVENTS`, `transition`, `BUS_EVENTS`, `WORLD_CHANGES` and `INTERACTABLE_BINDINGS` from `echo/contracts.js`, and do not define a second table in `game/state.js`.
2. **Point the quantum lane at `echo/CONTRACTS.md` § ExperimentResult** for `formats.py`, and story-ui at the same file for terminal and Declassified field names.
3. **Ask G0 (`g0-runner-smoke`) to confirm two things on the local runner and then on Qollab:** that `import './contracts.js'` works, and that `toJs({dict_converter: Object.fromEntries})` yields a plain object.
4. **Raise Q1–Q7 with the owner as `=== ASK_OWNER ===`.** Q2 and Q4 block the quantum lane's final shape least if answered tonight.
5. **Have someone fix `vault/Map-code.md`'s malformed area table and add `tools/`.**
