=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. Alongside it: a local Qollab-like runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After that, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** Fri about 23:50. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- **`shared-contracts`** (merged in consult 2).
- **`echo-caps-gate`** (merged in consult 3).
- **`g0-runner-smoke`** (judged this consult; MERGE below). What I checked:
  - Screenshots 1–4:
    - LOCAL RUNNER banner;
    - Pyodide py3.14.2 / Qiskit 2.5.2 / emscripten;
    - exact P(00)=P(11)=0.5;
    - one job of 256 shots;
    - the second press refused while the runner still counts 1;
    - with the guard removed, the runner goes red on Qollab's one-job error text.
  - I re-ran the caps gate myself on the merged tree (integration + g0 `echo/`): **GREEN, exit 0**, 8 files, one `backend.run` call site at `main.js:114`.
  - `git merge-tree`: clean.
  - Its owner questions are answered: IonQ sims are Free (already in owner-answers). `QOLLAB_SMOKE_TEST.md` may sit in the draft and is dropped from the release upload.

**G0 status:** the code is ready, and the local runner is green. **Row 3 is NOT closed.** It closes only when the overseer runs `echo/QOLLAB_SMOKE_TEST.md` on the Qollab draft and records the result in owner-answers (ASK below).

**In flight:**
- **`contracts-v2`**: bits first, then corrections; the owner's 13 answers; settings shape; the migration table.
- **`integration-shell`** (dispatched now):
  - `tools/assemble-echo/` builds one `echo/` from the lane integration refs into a temp directory.
  - The real `main.js`/`index.html` boot story-ui (`#echo-ui`), gameplay state and bus, and the quantum bridge, against `contracts.js`.
  - The G0 smoke path is retired once quantum's bridge replaces it.
  - Proven on the runner with screenshots.

**Known integration facts (measured this consult, `git ls-tree`):**
- quantum/integration has `echo/quantum/{__init__,cloning,entanglement,formats,qollab_job,teleportation}.py` and 8 files under `echo/tests/`. It has no `bridge.js` yet.
- gameplay/integration has `echo/game/{eventBus,missionRules,objectives,state}.js`. There is no controller or scene yet.
- story-ui/integration has `echo/main.css` and `echo/ui/{accessibility,dialogue,hud,menu}.js`.
- art has nothing yet. main has no `echo/`.
- **Conflict:** G0 wrote `echo/main.css`, but `main.css` is story-ui's file. On assembly, story-ui's copy wins and platform's smoke styles are dropped.
- `echo/quantum/smoke.py` (written by platform) is deleted once quantum's modules plus `bridge.js` cover the bridge proof.

**Next:**
1. Overseer runs the G0 smoke test on Qollab, and the result goes into owner-answers.
2. Merge `contracts-v2` when it reports with evidence, then relay its migration table.
3. Merge `integration-shell`. After every lane landing: assemble, run the caps gate and contracts `check.mjs`, load the runner, take screenshots.
4. When gameplay ships its controller and scene: the first playthrough of title → move → E at a terminal.
5. Later: the README as the Qollab write-up, the video script, 3 consecutive full runs (row 8).

**Risks:**
- Lanes edit cross-lane files (as with `main.css`). The assembler must report every path claimed by two refs, and must never pick a winner silently.
- Contract churn: v2 lands while the shell is being built. The shell imports only names and must merge v2 when it lands.
- `echo/tests/` counts toward the 100-file cap. Fine for now (about 30 files).
- The puppeteer dependency of `check.cjs` is borrowed from a global MCP install, which is fragile.
=== END PLAN ===

=== MERGE branch=lane/platform/g0-runner-smoke ===

=== AGENT name=integration-shell model=opus base=lane/platform/integration ===
# Brief: integration-shell (platform lane, row 7)

## GOAL
One `echo/` folder, assembled from every lane's real work, that loads on the local Qollab runner. The player sees the story-ui title screen over a Three.js canvas, presses Start, and the quest state machine moves BOOT→TITLE→… through `echo/contracts.js`. The settings menu changes render quality, and the local Qiskit bridge answers from the quantum lane's real modules. This shell is what every later playthrough, the G2 graybox and the release are built on.

## VISION
ECHO: ONE OF ONE (`ECHO_MASTER_VISION.md` §8.2 tree, §8.3 boot, §9 quest states, §12.3 honest errors). A Qollab-native game that a judge plays end to end. Platform owns `echo/main.js`, `echo/index.html`, the shared contracts and the integration (`.claude/rules/lane-ownership.md`).

## WHAT WE ARE BUILDING
1. **`tools/assemble-echo/`** (outside `echo/`): takes a list of git refs, by default
   - `lane/platform/integration`,
   - `lane/quantum/integration`,
   - `lane/gameplay/integration`,
   - `lane/story-ui/integration`,
   - `lane/art/integration`,

   and writes their `echo/` subtrees into one temp directory, following lane ownership (each path comes from the ref of the lane that owns it).
   - **Every path present in more than one ref must be printed.** It is never silently overwritten.
   - A path taken from a non-owner lane must be named.
   - Exit codes: 0 green, 1 conflict or ownership violation, 2 could not run.
   - Known conflict today: `echo/main.css` is on both platform (G0 smoke) and story-ui. Story-ui owns it.
2. **The real `echo/index.html`**: a body fragment holding the canvas host and one `<div id="echo-ui">` over it (story-ui relay, owner-answers 2026-10-10).
3. **The real `echo/main.js`**: boot sequence per §8.3.
   - Three.js renderer and scene. Use an empty room / placeholder until gameplay ships its scene and controller.
   - Mount story-ui modules into `#echo-ui`.
   - Run gameplay's state and event bus on `contracts.js`: import its names and never redefine them.
   - Route settings `quality` → renderer (pixel ratio and shadows) and `volume` → an audio stub.
   - Restart → the reset path (§9.5).
   - Release pointer lock while a menu or dialogue is open.
   - Quantum bridge: `import * as m from 'quantum.<mod>'` + `.callPromising()` + `.toJs({dict_converter: Object.fromEntries})`.
4. **Retire the G0 smoke path in the same change** (no-bloat), as soon as the real path covers it:
   - G0's own `backend.run` button and `echo/quantum/smoke.py`, and platform's smoke CSS.
   - The one-job verification must then come from quantum's `verifySelectedBackendOnce` in `echo/quantum/bridge.js` (owner ruling). That file is quantum-owned and does **not exist yet**.
   - Until it exists, keep exactly one guarded `backend.run` path, and list "bridge.js missing" as a request to the quantum lane in your report. Do not write `bridge.js` yourself.

## WHAT HAS NOT WORKED / KNOWN TRAPS
- Qollab compiles `main.js` with Babel to CommonJS and runs it inside an AsyncFunction. No top-level `import.meta`. Bare imports resolve to Python first. `three` is imported by name (0.186.1). `<script>` in `index.html` does not run. JS cannot read project files. Source: `vault/Research/qollab-js-runtime-internals.md`.
- `import './contracts.js'` under the CJS transform has **never been proven**: G0's `main.js` did not import it. Prove it on the runner first, and screenshot it.
- `toJs()` without `dict_converter` gives a `Map`. Cast numpy scalars in Python (owner probe).
- At most one `backend.run` per run, guarded before the first `await`.
- `contracts-v2` is being rewritten right now by another platform worker. Do **not** edit `echo/contracts.js` or `CONTRACTS.md`. Import names only. When `lane/platform/contracts-v2` is merged into `lane/platform/integration`, merge it in and fix the imports. Any contract you need goes in your report as a request.
- Edit only platform files (`echo/main.js`, `echo/index.html`, `tools/`). Other lanes' modules are read and assembled, never edited. A bug you find in another lane's module is reported with file:line and a repro.
- Earlier failures in this org: optimising against a test instead of the product, building behind flags nobody turns on, and judging the wrong artifact. The graded artifact is the **assembled** tree, served by the runner.

## VAULT NOTES TO READ FIRST
`vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-js-runtime-internals.md`, `vault/Research/qollab-platform-and-submission.md`, `vault/Reports/g0-runner-smoke.md`, `vault/Reports/shared-contracts.md`, `vault/Reports/qollab-caps-gate.md`, `echo/CONTRACTS.md`, `tools/qollab-runner/README.md`, plus `lanes/platform/owner-answers.md` (the story-ui relay, the 13 answers, red-team rulings, gameplay rulings).

## WHERE TO START
1. If `tools/qollab-runner/` is missing on your base, `git merge lane/platform/g0-runner-smoke` first. It is being merged into integration this consult.
2. Read the other lanes' modules on their refs: `git show lane/story-ui/integration:echo/ui/menu.js` and the like.
3. Write the assembler and its check first. Watch it go red on the current `main.css` double claim.
4. Serve the assembled tree on **your own port** (e.g. 4890–4899; never a shared port) with `tools/qollab-runner/server.mjs`.

## WHAT TO DELIVER
- Commits on your branch: `tools/assemble-echo/` (with fixtures for conflict and ownership), `echo/index.html`, `echo/main.js`, and the deletions of the G0 smoke path that the real path supersedes.
- Screenshots from the runner, on the assembled tree, with the build token read back from the served page (law 16):
  1. the title screen over the canvas;
  2. after Start: the state shown as TITLE→the next state per `contracts.js`;
  3. the settings menu with quality changed low→high, with a visible renderer difference or the logged pixel ratio;
  4. a quantum module answer (e.g. the cloning or entanglement result) through the bridge, shown on screen;
  5. the one-job guard still refusing a second job.
- On the assembled tree:
  - `node tools/qollab-caps/check.mjs --root <assembled>`: exit 0, file count printed;
  - the contracts check: exit 0.
- Sabotage on a disposable copy:
  - drop `#echo-ui` from `index.html`;
  - redefine one quest state locally in `main.js`;
  - remove the `dict_converter`;
  - make two lanes claim the same path.

  Each must go red. Report the nulls.

## HOW I WILL JUDGE IT
- From your screenshots of the **assembled** tree served by the runner. Screenshots of a platform-only tree do not count.
- Caps green on that tree. The CJS import of `contracts.js` proven.
- No contract table redefined in `main.js`.
- G0 smoke code deleted wherever superseded.
- Every cross-lane conflict named.

## REPORT
`lanes/platform/reports/0004-integration-shell.md`. It opens with **Vault check**, then TL;DR, commands + exit codes + artifact paths, nulls, cross-lane requests (quantum `bridge.js`, any bug in another lane with file:line), Questions for the owner (only spend, access, publishing or doc conflicts, per autonomous mode), and Next.
- **Checkpoint report within 1 h**, even if partial.
- Findings go to `vault/Reports/integration-shell.md`.
=== END AGENT ===

=== ASK_OWNER ===
**For the overseer (the only one who drives Qollab): please run the G0 smoke test. This closes plan row 3.**

- After the merge, it is on `lane/platform/integration`. The steps are in `echo/QOLLAB_SMOKE_TEST.md`.
- Run it on the ECHO draft (https://qollab.xyz/u/udsy/echo-one-of-one) on the **Built-in simulator** first. Then, optionally, on one **Free** IonQ remote simulator (never hardware).
- Upload `echo/` as-is (8 files). `QOLLAB_SMOKE_TEST.md` may stay in the draft; it is left out of the release.

Please record in owner-answers:
- the screenshot after step 7 and the copied console text;
- whether `toJs` gave plain objects;
- whether the second "Verify" press was refused;
- on the IonQ sim, whether the one job succeeded through `callPromising`.

Local-runner evidence for comparison: [scene+bridge](renders/g0-runner-smoke/1-scene-and-bridge-builtin.png) · [second press refused](renders/g0-runner-smoke/3-second-press-refused-ionq-mock.png).
=== END ASK ===

=== LEARN ===
2026-10-10 consult 4: I merged `g0-runner-smoke` on four pieces of evidence:
- screenshots 1–4: exact 0.5/0.5 from Pyodide py3.14.2 / Qiskit 2.5.2 / emscripten; one job of 256 shots; the second press refused; with the guard removed, the runner is red on Qollab's one-job error;
- my own caps-gate run on the merged tree: GREEN, exit 0, 8 files;
- `git merge-tree` clean.

G0 is still open until the overseer's Qollab run is recorded.

Gap carried forward: G0's `main.js` never imported `contracts.js`, so the import under the CJS transform is unproven. The integration-shell brief requires it to be proven first.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4: lane integration branches were measured with `git ls-tree`:
- quantum: 6 py modules + 8 files in `echo/tests`, no `bridge.js`;
- gameplay: `game/{eventBus,missionRules,objectives,state}.js`, no controller or scene;
- story-ui: `main.css` + 4 ui modules;
- art: nothing.

Lanes overlap on paths: G0 platform wrote `echo/main.css`, which is story-ui-owned. So integration needs an assembler that names every path claimed by two refs and takes the owner lane's copy. It must never use a silent last-writer-wins overlay.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4: I decided `g0-runner-smoke`'s Q3 under autonomous mode. `QOLLAB_SMOKE_TEST.md` may sit in the Qollab draft, but it is excluded from the release upload. Reason: README.md is the project write-up (QOLLAB_DEPLOYMENT.md, research note §README), and the smoke doc is dev-only.

Its Q2 was already answered: the IonQ simulators are Free when signed in (owner-answers 2026-10-10).
=== END LEARN ===
