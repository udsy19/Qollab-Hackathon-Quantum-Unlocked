
- 2026-10-10 consult 1: Story-ui modules must not depend on anything the platform lane owns. On Qollab, `<script>` in `index.html` does not run, `main.css` is the only stylesheet loaded, and JS cannot read project files (`vault/Research/qollab-platform-and-submission.md`). So:
- UI modules build their own DOM inside a root element passed in.
- Story data ships as JS modules, never JSON.
- All CSS lives in delimited sections of `echo/main.css`.
- Dev harnesses live outside `echo/` (`evidence/story-ui/harness/`) to stay under the 100-file cap.

`main.css` is a merge hot spot: merge ui-shell first, then the other workers rebase.

- 2026-10-10 consult 1: Until the quantum lane ships its §8.4 adapter, terminal work uses a harness stub with `engine: 'documented_preview'` that returns only textbook-exact values. The UI must always display the engine label. A screenshot without the label, or with stub values presented as Qiskit or backend output, is grounds to refuse the merge.

- 2026-10-10 consult 2: 2026-10-10 consult 2: I merged ui-shell after looking at the 8 renders myself.

The worker's driver passed 30 of 30, but my own look still found three defects the driver could not see:
- dialogue pages break mid-sentence
- kets render in ASCII
- the select uses the system font

Lesson: always Read the renders before merging. A green driver checks what its author thought of, not what a reader sees.

- 2026-10-10 consult 2: 2026-10-10 consult 2: The vision already settles two questions the ui-shell worker raised, so they did not go to the owner.

1. **Subtitles toggle.** Line 436 says "captions must be visible and not rely on voice-over", and there is no VO in scope. The Subtitles setting therefore becomes caption style, and captions are never off.
2. **Capsule labels.** The canonical strings are `Q-SOURCE: PRESERVED` (§6 mock), and `STATE PRESENT`, `STATE MEASURED / CONSUMED` and `STATE RECOVERED` (§4.4 beat 4).

Grep the vision before raising an owner question.

- 2026-10-10 consult 3: 2026-10-10 consult 3: I merged story-data after my own physics read of `script.md`. The phrase-gate's 4 nulls show that it cannot judge physics. A human read found a branch-dependent falsehood the gate could not see: `extra_X` said "a state that was already right", which is false when m0 = 1.

Lesson: for any failure or explanation copy, check every line against all 4 bit pairs × 4 X/Z plans, not against one example.

- 2026-10-10 consult 3: 2026-10-10 consult 3: Kets stay ASCII `|x>` in `echo/data/`. The vision itself uses ASCII (0 occurrences of ⟩), and the story-data gate checks verbatim lines byte for byte against it.

The ⟩ glyph is a display-time transform in the renderers (dialogue, terminal, declassified). Never rewrite the data to get it.

- 2026-10-10 consult 3: 2026-10-10 consult 3: I settled the story-data worker's 7 owner questions from the vision and rulings, without asking:
1. **VEGA:** a maintenance voice at the booth, fully woken at the relay. This reconciles §4.2 and §4.3.
2. **Relay pairs:** many pre-shared pairs plus a test rig (§7.4: unlimited dry runs). Only COMMIT spends a vault pair.
3. **Countdown at zero:** it holds at 00:00 with no game-over (line 89) and never goes negative (line 787).
4. **Pronouns:** none.
5. **Teach-back:** multiple choice, a "why" on every choice, no score (§4.5).
6. **m1 label and credits:** already in the rulings.

- 2026-10-10 consult 4: 2026-10-10 consult 4: The lane restarted at 03:51 UTC and silently lost both the running worker and the queued worker briefs. Evidence:
- `lane.log`: `terminals` started 03:49 and the restart came at 03:51.
- `logs/0002-terminals.log` is empty.
- The terminals branch has 0 commits and a clean worktree.

The consult showed "running: none, queued: none", even though the plan said four were pending.

Lesson: at every consult, compare the plan's "in flight" list with the running/queued lists and each branch's commits. Re-dispatch whatever is missing, and require a checkpoint commit within 25 minutes so a crash loses less.

- 2026-10-10 consult 4: 2026-10-10 consult 4: The platform contract renamed the rooftop console id. Use `teleport_terminal` (`lane/platform/integration:echo/contracts.js` BINDINGS), not `classical_socket` from §9.4. The quantum ExperimentResult shape is defined by `lane/quantum/integration:echo/quantum/formats.py` `experiment_result`. Harness stubs must mirror that file exactly, so the swap to `bridge.js` is one line.

- 2026-10-10 consult 5: 2026-10-10 consult 5: On the overseer's notice that "contracts v2 is on main", check with `git merge-base --is-ancestor main lane/story-ui/integration`. Do not assume the lane already has it. At consult 5 it exited 1, with the lane 74 files behind main.

Rule: emit MERGE branch=main before dispatching, and every new brief starts with an ancestor check plus `git merge main`. Workers started before the merge (here terminals-c4) must show v2 conformance before I merge them: the bits-first dry run, the `ExperimentResult` shape from `echo/contracts.js`, and passing `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`.

- 2026-10-10 consult 6: 2026-10-10 consult 6: I merged data-fixes after rerunning its gate myself in a disposable worktree: `git worktree add --detach /tmp/sv-df <branch>`, then check.mjs → GREEN with 11655 checks. I also checked its 16-row table against the closed form. Before correction the receiver holds X^m1 Z^m0·ψ. After a plan (x, z) it holds X^(x⊕m1) Z^(z⊕m0)·ψ. On ry(1.137) the leftover-Z fidelity is cos²(1.137) ≈ 0.177.

Lesson: judge teleport copy per switch. A line about one switch must never imply anything about the other, which is how `missing_X` was false in the 4 both-wrong cases that my consult-3 read missed. Use the closed form as the supervisor's quick check.

- 2026-10-10 consult 6: 2026-10-10 consult 6, a decision inferred from the docs. Opening skip is ALWAYS available, from the first frame. Basis: §3.4 says "skip opening after first view", but QOLLAB_DEPLOYMENT and the runtime rules say there is no persistence and the interpreter is fresh every Run. So every run is a first view, and a first-view gate would make the opening unskippable for judges, against §6 line 371 and the §12 "Skip cinematic" smoke test.

The opening fires `onShot` A–D for the gameplay camera. Story-ui owns only the captions, the card and Skip, never the camera.
