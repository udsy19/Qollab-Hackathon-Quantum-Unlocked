# Owner rulings: lane gameplay (the current law)

The owner's decisions that bind this lane NOW, one line each, curated by the overseer from
`owner-answers.md` (the raw, append-only log). Every consult carries this file in full, plus only the newest
raw answers, so this is where a ruling must be to be remembered.

- Keep it current: when an answer supersedes a ruling, replace the ruling here (the log keeps the history).
- One line per ruling: `- <ruling> — <YYYY-MM-DD>, owner-answers § <entry heading>`.
- Short and true beats complete. Standing org-wide rulings live in `context.md`, not here.

## Rulings
- AUTONOMOUS: decide design choices from the vision docs (cite them in LEARN); ASK_OWNER only for spend, access, publishing, credit names, or doc conflicts — 2026-10-10, owner-answers § AUTONOMOUS MODE
- The four vision docs are owner-only — 2026-10-09, owner-answers § setup
- `echo/` is the Qollab root; ≤1 `backend.run` per run; only the owner runs/publishes on Qollab — 2026-10-09, owner-answers § setup
- This lane owns — gameplay: `echo/game/` (not `audio.js`), `echo/scene/` (not lighting/rain/props/buildings/effects) — 2026-10-09, owner-answers § setup
- Feature freeze Sun 2026-10-11 14:00 ET; G2 missed at Sat 17:00 → one-room cut — 2026-10-09, owner-answers § setup
- Credits: Team The Quantubians (NYU Tandon) — Udaya (captain), George, Harman, Epa; no emails; license holder "udsy19 and contributors" — 2026-10-10, owner-answers § credit names
- Never spend Qollab/IonQ credits; IonQ only if free, else documented as untested — 2026-10-10, owner-answers § platform consult 1 questions
- Shared contracts live in `echo/contracts.js` (+ `echo/CONTRACTS.md`), platform-owned, imported by all lanes — 2026-10-10, owner-answers § platform consult 1 questions
- The overseer drives Qollab (one draft, free sims, IonQ only if Free, never publish); workers never do; Qollab results count only when recorded here with evidence — 2026-10-10, owner-answers § who drives Qollab
- IonQ remote simulators are Free when signed in (evidence/qollab/select-qpu-signed-in-2026-10-10.png); IonQ hardware is never used — 2026-10-10, owner-answers § IonQ simulator label
- On Qollab (Pyodide py3.14.2, Qiskit 2.5.2) Statevector/DensityMatrix/partial_trace/state_fidelity work; cast numpy scalars before returning to JS — 2026-10-10, owner-answers § Pyodide Qiskit probe
- Contracts: BOOT→TITLE, DECLASSIFIED→CREDITS/ENDING edges; ExperimentResult gains keyQubits + observables; previews carry no counts; backend job experiment = "backend_verification"; QUEST_STATE_CHANGED, CLOSE_TERMINAL, snake_case world ids; console id teleport_terminal; movement events from gameplay triggers, acknowledgement events from story-ui terminals — 2026-10-10, owner-answers § 13 lane design questions
- Quantum: random generic dry-run states (named-state blind spot as optional fact); story token fixed + hidden; 256 shots; `echo/quantum/bridge.js` (quantum-owned) holds verifySelectedBackendOnce — 2026-10-10, owner-answers § 13 lane design questions
- Gameplay: wrong dry run → fresh calibration state; RESTART on the ending screen; acknowledgements only after the result panel was shown — 2026-10-10, owner-answers § 13 lane design questions
- m1 label "LOCAL BELL-HALF READOUT m1"; player picks X/Z after seeing m0,m1 (bits first, corrections second); generic state ry(1.137) then rz(0.44); Mission 2 receiver shows EXACT partial_trace probabilities only; captions always on (style setting) — 2026-10-10, owner-answers § red-team physics ambiguities + captions
- Final COMMIT is one atomic local exact call; token marked consumed only on success; on error, honest error + retry; latched once recorded. COMMIT unlocks after ≥1 correct non-00 dry run; UI offers all four X/Z choices — 2026-10-10, owner-answers § overseer rulings — gameplay consult 3
- Theme declared: Quantum Unlocked; accessibility claim "targets WCAG 2.2 AA" only for checks actually run — 2026-10-10, owner-answers § overseer rulings — red-team consult 3
- ONE ExperimentResult shape, owned by platform in echo/contracts.js; exactly one guarded backend.run site (echo/quantum/bridge.js); tests run on real engine output; no integrated product code lands on main until red-team's cross_lane_check passes (platform MAY land the contract files echo/contracts.js + CONTRACTS.md early so every lane builds on them) — 2026-10-10, owner-answers § overseer relay from red-team physics-code-audit
- Full autonomy until submission; use the raised parallel cap for independent work — 2026-10-10, owner-answers § do not stop until you are done
