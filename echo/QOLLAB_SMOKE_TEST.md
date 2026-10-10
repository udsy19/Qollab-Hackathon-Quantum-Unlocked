# G0 smoke test on Qollab: owner steps

This file is for the owner. Run it once, before any game code goes on Qollab. It answers three questions on the real platform: does Three.js render, does a Qiskit result reach JavaScript through the Python bridge, and does the project send exactly one job to the selected backend? So far this project has been run only on the **local runner** (`tools/qollab-runner/`), never on Qollab.

**Reference picture (local runner, not Qollab):** `evidence/platform/g0/builtin-2-one-job-counts.png` in the repo. Qollab should show the same page above its own console.

## What to upload

Upload the contents of the `echo/` folder and nothing else:

```
index.html  main.js  main.css  requirements.txt  quantum/smoke.py  QOLLAB_SMOKE_TEST.md
```

That is 6 files, all far under 2 MB, against a cap of 100 files. `index.html` and `main.js` must end up at the **top level** of the project, because that is what makes it a JS project. Qollab strips a single wrapping folder, so uploading the `echo` folder itself, or a `.zip` of it, also works (upload-your-files doc).

## Steps (built-in simulator, the path judges use)

1. Use **Chrome, Edge, Brave or Opera**, or Firefox 153+. Not Safari, and not an iPhone or iPad.
2. Sign in to qollab.xyz. Press **+ New Project**, choose **Upload your own files**, and select the `echo` folder (or a zip of it). Name it anything, for example `echo-g0-smoke`. Leave it unpublished; this is a draft test.
3. Open the **Code** tab. The file tree should show the files above at the top level, and the editor should label the project **HTML/JS**.
4. Press **Run Project**, then **Run**. In **Select QPU**, under *Locally Run Simulators*, pick **Built-in simulator (24q)**, then press **Run**.
5. **Expect**, after the console shows *Loading packages… Loading project files… Running…*:
   - **Scene:** a glowing cyan cube turning slowly above a dark grid floor, on the left of the page.
   - **Panel header:** `Build g0-smoke-2026-10-10b · backend basic_simulator`.
   - **Section 1 box:** JSON with `"probabilities": {"11": 0.5, "00": 0.5}`, `"reduced_purity_q0": 0.5`, `"fidelity_with_phi_plus": 1`, `"qiskit_version": "2.5.x"`, `"python_version": "3.14.x"` and `"platform": "emscripten"`.
   - **Console:** the line `ECHO G0 smoke build g0-smoke-2026-10-10b on backend basic_simulator`, then `bridge: {…}`, then `Done.`
6. Press **Verify on selected backend** once. **Expect:**
   - **Section 2 box:** `{"kind": "sampled_counts", "backend": "basic_simulator", "shots": 256, "counts": {"00": ~128, "11": ~128}}`. Only `00` and `11` appear, and the two add up to 256.
   - **Status line (green):** `Done: 1 job, 256 shots on basic_simulator.`
   - **Probabilities panel** beside the console: about 50 % / 50 %.
7. Press **Verify on selected backend** a **second** time. **Expect** the yellow line *"Refused: this run has already used its one selected-backend job. Press Stop, then Run, to send another."* The counts should not change, no new `backend counts:` line should appear in the console, and the Probabilities panel should not change.
8. Press **Stop**. Send back a screenshot of the page after step 7 and the console text (use the console's copy button).

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
| The second press sends a job (counts change, or a new console line) | The guard failed | Stop; do not try the IonQ step; send it |
| The page looks unstyled | `main.css` was not loaded | Send it |

## Optional: the IonQ simulator (one job)

Do this only after the built-in run matches. It checks that the one-job design holds on a backend that **enforces** one job per run.

1. Press **Stop**, then **Run**. In **Select QPU**, under *Remotely Run Simulators*, pick **IonQ Forte 1 (29q)**.
2. **The row may say "Credits apply".** The docs say IonQ simulators are free, but signed out the live dialog labels them "Credits apply" (seen 2026-10-09; we have not checked signed in). If a credits or consent prompt appears, it is your call. You can cancel and tell us what it said; nothing in this test needs it.
3. If you go ahead, the header should show a different backend name, and Section 1 should be identical (it never touches the backend). Press **Verify on selected backend** once. The job goes to IonQ's cloud, so it can take longer. Counts may include a few `01`/`10` from the noise model. Then press it once more: you should see the same yellow **Refused** line, and the console should **not** show "only one job is allowed per code run".
4. Send the screenshot and console text, and tell us exactly what the Select QPU row said (Free or Credits apply).
