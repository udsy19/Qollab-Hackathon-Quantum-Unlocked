# G0 smoke test on Qollab: owner steps

This file is for the owner. Run it once, before any game code goes on Qollab. It answers three questions on the real platform: does Three.js render, does a Qiskit result reach JavaScript through the Python bridge, and does the project send exactly one job to the selected backend? So far this project has been run only on the **local runner** (`tools/qollab-runner/`), never on Qollab.

**Reference pictures (local runner, not Qollab):** `evidence/platform/g0-input-diagnostic/` in the repo: `builtin-auto-a-counters-zero.png` (just loaded), `builtin-auto-b-counters-after-input.png` (after one click and one key), `builtin-auto-c-auto-send-one-job.png` (the auto-send's job). Qollab should show the same page above its own console.

## What to upload

Upload the contents of the `echo/` folder and nothing else:

```
index.html  main.js  main.css  diag.js  requirements.txt  quantum/smoke.py  QOLLAB_SMOKE_TEST.md
```

(`contracts.js` and `CONTRACTS.md` may ride along; the smoke page does not use them.) That is 7–9 files, all far under 2 MB, against a cap of 100 files. `index.html` and `main.js` must end up at the **top level** of the project, because that is what makes it a JS project. Qollab strips a single wrapping folder, so uploading the `echo` folder itself, or a `.zip` of it, also works (upload-your-files doc).

## Steps (built-in simulator, the path judges use)

1. Use **Chrome, Edge, Brave or Opera**, or Firefox 153+. Not Safari, and not an iPhone or iPad.
2. Sign in to qollab.xyz. Press **+ New Project**, choose **Upload your own files**, and select the `echo` folder (or a zip of it). Name it anything, for example `echo-g0-smoke`. Leave it unpublished; this is a draft test.
3. Open the **Code** tab. The file tree should show the files above at the top level, and the editor should label the project **HTML/JS**.
4. Press **Run Project**, then **Run**. In **Select QPU**, under *Locally Run Simulators*, pick **Built-in simulator (24q)**, then press **Run**.
5. **Expect**, after the console shows *Loading packages… Loading project files… Running…*:
   - **Scene:** a glowing cyan cube turning slowly above a dark grid floor, on the left of the page.
   - **Input diagnostic** (yellow-bordered box, top left, over the scene): `pointerdown 0`, `click 0`, `keydown 0`, verdict `NO INPUT YET`, `document.hasFocus() false` (Qollab never focuses the preview frame), `origin null`, `pointer lock not tried (press L)`, and `since bridge result` counting up.
   - **Panel header:** `Build g0-smoke-2026-10-10c · backend basic_simulator`.
   - **Section 1 box:** JSON with `"probabilities": {"11": 0.5, "00": 0.5}`, `"reduced_purity_q0": 0.5`, `"fidelity_with_phi_plus": 1`, `"qiskit_version": "2.5.x"`, `"python_version": "3.14.x"` and `"platform": "emscripten"`.
   - **Section 2:** a yellow line `Auto-sending the one job in 5 s…` counting down, with a **Cancel auto-send** button.
   - **Console:** the line `ECHO G0 smoke build g0-smoke-2026-10-10c on backend basic_simulator`, then `bridge: {…}`. **`Done.` does NOT appear yet**: the page now keeps running until its one job finishes (see "Why Done. comes late" below).
6. **One job — no input needed. Just wait.** About 5 s after the bridge JSON appears, the countdown reaches 0 and the page sends the ONE backend job itself, through the same guard as the Verify button. **Expect**:
   - `Auto-send fired.` and the green status `Done: 1 job (auto), 256 shots on basic_simulator.`
   - **Section 2 box:** `{"kind": "sampled_counts", "backend": "basic_simulator", "shots": 256, "counts": {"00": ~128, "11": ~128}}`. Only `00` and `11`, adding up to 256.
   - **Console:** `backend counts: {…}`, then `Done.`. **Probabilities panel** beside the console: about 50 % / 50 %.
   - The diagnostic counters are still 0 if you have not touched the page.
7. **Input check (any time after step 6).** Click once on the **scene** (the cube area, not a button), press the **K** key once, press **L** once, then click **Verify on selected backend** once. **Expect** in the diagnostic box: `pointerdown 2`, `click 2`, `keydown 2`, `last key l`, `last pointer target button#verify-btn`, `document.hasFocus() true`, verdict `INPUT REACHES PAGE (pointer + keys)`, and `pointer lock REFUSED` (Qollab's frame has no `allow-pointer-lock`; expected, and it is the answer we need). In Section 2, expect the yellow line *"Refused: this run has already used its one selected-backend job. Press Stop, then Run, to send another."*; the counts and the Probabilities panel do not change. (No console line appears for this press: after `Done.`, Qollab's console no longer listens to the page.)
8. Press **Stop**. Send back one screenshot after step 7 (it shows both answers: the job in Section 2 and the counters in the box) and the console text (use the console's copy button).

Optional variants (each is a fresh **Stop → Run**): press **Cancel auto-send** during the countdown → `Auto-send cancelled…`, no job, no counts, no `Done.`; or press **Verify** during the countdown → `Auto-send stopped: the button was pressed.` and `Done: 1 job (button), …`, and nothing more after the countdown would have ended.

### Reading the diagnostic: which failure is it?

| after steps 6–7 you see | it means | what we do |
|---|---|---|
| counters stay at **0** after your click and key, the auto-send job **arrives** | Input does not reach the preview frame (the page itself is alive: its timer sent the job) | Tell us how you clicked (mouse, automation). Try a real mouse click on the scene. If a real click also counts 0, something in Qollab's page sits over the frame; platform investigates |
| `pointerdown`/`click` go up but `keydown` stays **0** | The frame got the pointer but not keyboard focus | Click on the scene again, then type; send the `active element` and `hasFocus()` rows |
| counters go **up**, but the Verify press shows no yellow Refused line | Input arrives, the page's click handler is dead | Send the console text; platform fixes main.js |
| the countdown never moves and no job arrives (and no red console error) | The page's timers stopped after the bridge result | Send the console text and the `since bridge result` row |
| counters go **up**, auto-send job arrives, Verify press is **refused** | All good: input reaches the page and the one-job guard holds | Proceed to the IonQ step |
| `pointer lock GRANTED` | Qollab added `allow-pointer-lock` since 2026-10-10 | Tell us; the game can then use mouse-look with pointer lock |
| `Backend job failed: …` after the auto-send | The job itself failed on this backend | Send the console text |
| `Done.` appears right after `bridge: {…}` | An old build (10b) is running | Check the header says `10c`; re-upload |

### Why `Done.` comes late

Read from Qollab's shipped code on 2026-10-10: when `main.js` finishes, Qollab prints `Done.` and its page **stops listening** to the project frame (console lines, the Probabilities panel and the credits prompt), and the frame stops routing IonQ requests through Qollab. The page stays visible and clickable. So this build keeps `main.js` running until its one job is done; the game will do the same until the ending.

## If something is different, what it means

| you see | it means | what we do |
|---|---|---|
| Run stays disabled, or there is a compatibility warning | The browser lacks WebAssembly JSPI | Switch to Chrome |
| The project runs as Python, or "Run is disabled" | `index.html`/`main.js` are not at the top level | Re-upload the folder contents, not a parent folder |
| Section 1 says `Python bridge failed: … No module named 'quantum'` | Qollab did not load `quantum/smoke.py` from a JS import | Platform lane adds `quantum/__init__.py` (we left it out because the docs' own example works without it) |
| Section 1 is still `Waiting for Python…` with a red console error | The bridge call shape differs on Qollab | Send the console text; the platform lane fixes it |
| JSON shows `{}` or `[object Map]` | `.toJs()` conversion differs | Send it; this is a one-line fix in `main.js` |
| No cube, but the panels work | WebGL is unavailable or `three` failed to import | Send the console text; try another browser |
| Counts include `01`/`10` on the built-in simulator | Should be impossible; a wrong circuit | Send it |
| A press after the auto-send sends a job (counts change) | The guard failed | Stop; do not try the IonQ step; send it |
| The page looks unstyled | `main.css` was not loaded | Send it |

## Optional: the IonQ simulator (one job)

Do this only after the built-in run matches. It checks that the one-job design holds on a backend that **enforces** one job per run.

1. Press **Stop**, then **Run**. In **Select QPU**, under *Remotely Run Simulators*, pick **IonQ Forte 1 (29q)**.
2. **The row may say "Credits apply".** The docs say IonQ simulators are free, but signed out the live dialog labels them "Credits apply" (seen 2026-10-09; we have not checked signed in). If a credits or consent prompt appears, it is your call. You can cancel and tell us what it said; nothing in this test needs it.
3. If you go ahead, the header should show a different backend name, and Section 1 should be identical (it never touches the backend). Let the countdown send the one job (or press **Verify** during it). The job goes to IonQ's cloud, so it can take longer. Counts may include a few `01`/`10` from the noise model. Then press **Verify**: you should see the same yellow **Refused** line, and the console should **not** show "only one job is allowed per code run".
4. Send the screenshot and console text, and tell us exactly what the Select QPU row said (Free or Credits apply).
