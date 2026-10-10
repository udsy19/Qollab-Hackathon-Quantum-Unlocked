
## Consult 1 (2026-10-10 03:21 UTC)
1. **G0 needs you on Qollab tonight.** Once `echo/QOLLAB_SMOKE_TEST.md` lands (target: within ~1.5 h), can you upload `echo/` and run it once on the **built-in simulator**? Please paste what you see, or a screenshot, into `owner-answers.md`. Nothing else can prove G0, and I will not report it done without your confirmation.
2. **IonQ simulator label.** Signed out, Qollab labelled the IonQ remote simulators "Credits apply", while the docs say they are free. When signed in, what does Select QPU show for IonQ Aria/Forte simulators, and may we spend credits on **one** job per test run if it says credits?
3. **Where the shared contracts live.** I plan one platform-owned file, `echo/contracts.js` (quest states, transitions, event names, interactable ids, the `ExperimentResult` validator), plus `echo/CONTRACTS.md` for the other lanes. The vision's §8.2 tree has no slot for it. OK, or do you want it elsewhere?
4. **Credits.** Which names go in the in-game credits and the README? (Your ruling says to ask before writing them; this is needed by Sun 05:00, not tonight.)

## Consult 2 (2026-10-10 03:31 UTC)
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

## Consult 4 (2026-10-10 03:47 UTC)
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
