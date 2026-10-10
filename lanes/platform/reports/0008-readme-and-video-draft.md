## TL;DR
- DONE (draft): `echo/README.md` (7,381 chars, one paragraph per line) and `docs/VIDEO_SCRIPT.md` (10 shots, 2:40) are in commit `fda98f5` on `lane/platform/readme-and-video-draft`. The vault report is `vault/Reports/readme-and-video-draft.md`.
- Rendered with `marked {gfm:true, breaks:true}` in headless Chrome: `renders/readme-and-video-draft/readme.png`.
- `node tools/qollab-caps/check.mjs --root echo` is GREEN (exit 0). File count went 8 → 9.
- Video check: total 160 s, every shot names a state that is in `QUEST_STATE_LIST`. It goes red (exit 1) under two sabotages: an unknown state, and a lengthened shot.
- The README makes no Qollab-run, IonQ, publish or test-count claims. The places that need recorded evidence carry `<!-- FILL AFTER OVERSEER RUN -->`, `FILL AFTER VIDEO UPLOAD` and `FILL AFTER ACCESSIBILITY CHECKS`.
- Main caveat: nothing is integrated yet. Gameplay and UI claims are sourced to code that exists today on lane branches (the audit below names them). Re-run the claim audit on the integrated build before upload.
- Recommend: merge as is. Before it lands on main, (1) fill the placeholders from the overseer's run and (2) fix the Q/Tab control mismatch in story-ui (see Found).

## Vault check
- **Read:** `vault/Home.md`, `vault/AGENTS.md`, `vault/Index.md` (no README or video entries), `vault/Research/qollab-platform-and-submission.md` §6 A–E (write-up skeleton, run steps, YouTube-only embeds, `breaks: true`, browsers), `vault/CLAUDE.md`, lane `context.md`, `rulings.md`, `owner-answers.md`, and vision §1, §4, §7.4–7.5, §15–17.
- **Not read:** `vault/Research/qollab-js-runtime-internals.md` and `vault/Reports/contracts-v2.md`. I read `echo/contracts.js` directly instead.
- **Reused:** the §6C skeleton order (Soundtrack exemplar), the §6D run steps, and the vision §15 2:40 table as the base of the video script.
- **Already known:** README rules, browser support, the one-job rule, credits, theme and WCAG wording.
- **Prior art:** `where.mjs VIDEO_SCRIPT --branches` found nothing, and `git log --all` shows no earlier README or video script.
- **Stale:** `vault/Home.md` NOW still says "2026-10-09 … echo/ does not exist" and lists G0 as the next move. The lane `context.md` "Where things stand" is just as stale.

## What I found
- **No integrated build exists.** `echo/` on `platform/integration` and `integration-shell` is still the G0 smoke build. Quantum, gameplay and story-ui code live on their own lane branches.
- **Quantum tests:** on `lane/quantum/integration` f7efb92 the result is **452 passed, 1 failed** (`test_contract_conformance.py::test_every_bridge_result_passes_the_platform_validator`). That is why the README states no pass count.
- **Control list mismatch:** story-ui `menu.js` lists `Q · Field scan` and `Tab · Journal`. No code anywhere handles `KeyQ`, and `Tab` is only focus-trapping (`ui/accessibility.js:54`). The README leaves both keys out.
- **Commit-unlock ruling not visible in code:** the ruling says commit unlocks only after a correct dry run whose bits are not 00. I could not find that check in `missionRules.js` on `gameplay-real-engine-seam` or `gameplay-world-v2-port`. The README claims only "commit only after a correct dry run", which the contract enforces.
- **Third-party imports, from grep of `echo/` on 6 lane branches:** the only bare import is `three`, plus the `quantum.*` Python modules. There are no CDN URLs and no `postprocessing`. Pyodide and Qiskit come from Qollab, and `requirements.txt` has no Qiskit line.

## Claim audit (README sentence → source)
| README claim | Source |
|---|---|
| Rin Vale, courier, Nacre City, District Nine shutdown, authorization is an unknown quantum state | `lane/story-ui/integration:echo/data/story.js:11-38`; vision §1.1 |
| Can't copy / entanglement can't send / teleport consumes original | quantum module docstrings `cloning.py:1-5`, `entanglement.py:1-6`, `teleportation.py:1-16` (lane/quantum/integration) |
| Theme Quantum Unlocked | rulings.md (red-team consult 3) |
| Three missions, names | `echo/contracts.js:24-30` QUEST_STATE_LIST; `data/teachback.js` JOURNAL titles |
| \|0⟩→\|00⟩, \|1⟩→\|11⟩, \|+⟩ entangled, purity 0.5 | `cloning.py:16-30`; `teachback.js` DECLASSIFIED copy tab |
| I/X/Z on sender, receiver alone 50/50, pattern only when logs compared | `entanglement.py:1-6,13,23`; ruling "Mission 2 EXACT partial_trace" |
| Bell measurement, two bits, player picks corrections, original consumed | `teleportation.py:1-16`; ruling "bits first, corrections second" |
| m0 SOURCE READOUT, m1 LOCAL BELL-HALF READOUT, X iff m1=1, Z iff m0=1 | `echo/contracts.js` BIT_LABELS, `expectedCorrections`; `teleportation.py:3-5` |
| No FTL / no copying / no matter / not certified random | vision §7.5; physics of the modules above |
| Browsers; Safari/iOS can't run | Research note §1 table (runtime-environment § Browser support) |
| Run on Qollab → Built-in simulator 24q, no sign-in for local sims | Research note §6D; owner-answers § G0 (Built-in simulator (24q)) |
| Click to focus | input.js pointer-lock/drag on canvas (`gameplay-world-v2-port:echo/game/input.js:31-45`); G0 input finding |
| WASD/arrows, Shift sprint, E, mouse lock or drag | `input.js:3,24,29-45`; `controller.js:6-7`; `app.js:116` |
| Enter/Space continue, Esc pause | `story-ui:echo/ui/dialogue.js:176`, `ui/menu.js:250-261` |
| Captions always on; caption style, reduced motion, text size, quality, volume | `echo/contracts.js:278-282` DEFAULT_SETTINGS; ruling "captions always on" |
| Puzzles call `quantum/` via Pyodide bridge, exact Statevector/partial_trace/state_fidelity | `quantum/bridge.js:1-20`; module imports; owner-answers § Pyodide Qiskit probe |
| Not hard-coded or looked up by name | `cloning.py:4` "DERIVED … never looked up by state name"; `teleportation.py:29` "Fidelities are never derived from this" |
| One job max, 2-qubit Bell, H q0, CNOT, measure both, 256 shots | `qollab_job.py:1-35,37-45`; `contracts.js:153` BACKEND_SHOTS; `bridge.js` verifySelectedBackendOnce memo |
| IonQ accepts one job per run | `qollab_job.py:4-5` (runtime-environment#one-job-per-run-on-ionq) |
| Counts labelled with backend name | `qollab_job.py:84,143` interpret_counts(backend_name), _backend_label |
| Engine labels exact_qiskit_local / qollab_selected_backend | `echo/contracts.js:149`; `formats.py:11` |
| Exact result carries probabilities only, never counts | `formats.py:70-71` |
| Unlimited dry runs on fresh random calibration states; a wrong X/Z visibly drops fidelity | `contracts.js:137,261` (GENERIC_MAX_WRONG_FIDELITY 0.9, randomGenericState); ruling (13 q #7, #11) |
| Commit only after correct dry run | `contracts.js:54-56` TRANSITIONS |
| Commit = new Bell measurement, calibrated rule, consumes original; re-press returns same result | `teleportation.py:13,175-177`; `bridge.js:77-90` commit latch |
| Smoke build ran on Qollab Built-in sim | owner-answers § G0 on real Qollab; `evidence/qollab/g0-builtin-scene-and-bridge-2026-10-10.jpg` |
| IonQ on Qollab untested; IonQ hardware not used | no record in owner-answers; ruling "IonQ hardware is never used" |
| Circuit table rows | `cloning.py:16-20`, `entanglement.py:23-30`, `teleportation.py:2-4` |
| contracts.js contents; pass mark ≥0.999999 | `contracts.js:1-5,136` |
| bridge.js validates every result; honest error | `bridge.js:5-7` |
| Problem-first novelty, causal chain | vision §1.3 (a design claim; mirrors quest order in TRANSITIONS) |
| Targets WCAG 2.2 AA + placeholder | ruling (red-team consult 3); no checks recorded → placeholder |
| Written during window from Oct 9 19:00 ET | first `echo/` commits 2026-10-09 23:25–23:29 -0400 on all branches (`git log --reverse -- echo`) |
| AI coding assistants used | this org runs on Claude Code (lane context) |
| three 0.186.1 MIT; Pyodide MPL-2.0; Qiskit 2.5.x Apache-2.0 | grep of imports (above); Research note (three 0.186.1); owner-answers § Pyodide probe (Qiskit 2.5.2); licenses are those projects' published licenses (not re-fetched this session) |
| Credits, MIT holder, attribution line | rulings.md credits; context.md licensing |

I deleted claims I could not source: DensityMatrix use (no module calls it), "never mixed in one display", and "commit unlocks after a non-00 dry run".

## Commits
- `fda98f5`: `echo/README.md`, `docs/VIDEO_SCRIPT.md` and `vault/Reports/readme-and-video-draft.md`. Hubs are not committed, per the rules (`vault-hubs --check` shows `Reports/README.md` and `Map.md` stale until the loop regenerates them).

## Evidence
- `renders/readme-and-video-draft/readme.png` is the README rendered with marked 18.x (`gfm`, `breaks: true`) in headless Chrome 900 px wide.
- Caps gate: GREEN, "scanned 9 files".
- Video checker, inlined so it can be re-run: it parses each `| n |` row, checks that start equals the previous end and that end − start equals the stated length, checks every backticked state against `QUEST_STATE_LIST` from `echo/contracts.js`, and requires a total of 150–170 s. Real file: exit 0, 160 s. Sabotage `CREDITS`→`CREDITZ`: exit 1. Sabotage last shot 0:07→0:37: exit 1.

## Not done / not verified
- Not verified in Qollab's actual write-up Preview (only the overseer may drive Qollab), so the rendering there is unconfirmed. In particular, I don't know whether Qollab's sanitiser strips the HTML-comment placeholders or shows them.
- No integrated build exists to check the README against. Every gameplay claim must be re-checked on the integrated `echo/`.
- Licence names were not re-fetched from upstream this session.
- `docs/` is a new top-level folder, outside `echo/`, as the brief asked.

## Decisions inferred from the docs
- **Video placement:** the video is an HTML-comment placeholder at the top of the README, because the Research note §6C says YouTube embeds go right under the hook.
- **Left-out controls:** Q and Tab are omitted from the controls table, because CLAUDE.md "no invented tool success" and the brief's "leave unbuilt features out" apply to keys nothing handles.
- **Video shot 8 placement:** the backend job is shown during `TELEPORT_DRY_RUN_PASSED`. Vision §15 places "Qiskit code and actual simulator results" after the X/Z beat. The script tells the recorder to move the shot if the build triggers the job elsewhere.
- **No "Make it yours" fork section:** the Research note §6C suggests one, but it would name constants that may still change before freeze. Add it after freeze.

## What the supervisor should do next
1. Merge `lane/platform/readme-and-video-draft`.
2. Relay to story-ui and gameplay: `menu.js` CONTROLS lists Q (field scan) and Tab (journal), but nothing handles them. Either wire them or remove them.
3. Relay to gameplay: the non-00 commit-unlock ruling has no visible check in `missionRules.js`.
4. Relay to quantum: 1 failing conformance test at f7efb92.
5. After the integrated build runs on Qollab, have a worker fill the three placeholders from `owner-answers.md` evidence and re-run this claim audit against the integrated `echo/`.
6. Ask the overseer to paste the README into the draft's write-up **Preview** (no publish) to confirm the tables, the `\|` escapes and the comment placeholders render correctly.
