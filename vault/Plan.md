---
type: plan
status: current
date: 2026-10-09
updated: 2026-10-09
owner: supervisor
---

# Plan of record — the ordered work

**The goal** ([[Vision]]): A ten-minute third-person cyberpunk game where quantum mechanics are the rules of the puzzles: no-cloning, no-signalling and teleportation, backed by real Qiskit. This file is the ONE ordered list of work.
Supervisor-owned: a subagent reads its row with `node scripts/plan-row.mjs <id>` and changes
nothing here — it proposes with `node scripts/propose.mjs`.

**Ordering.** Rows are worked lowest number first unless the "Active order" note below says
otherwise. A row is ONE task an agent can finish and a reviewer can grade; a row that is really
several is decomposed into `N.1 … N.k` BEFORE it is dispatched (`scripts/gates/plan-hierarchy.mjs`:
a parent is not done while a child is open; one level of nesting only).

**A task is ticked by the LANDER, in the same change as the work, with the gate's exit code
quoted** — never by the agent that wrote the code, never off a summary line.

**This plan has its own gate.** `node scripts/gates/plan-integrity.mjs` re-derives everything from
the table's bytes and consumes NOTHING the plan says about itself (not the Status roll-up below).
**The status column is a closed set: `open` · `in-flight:<branch>` · `blocked-on-owner:<Oid>` ·
`done:<sha>`**, and every `<Oid>` must be declared in the "Blocked on the owner" table. Every row
has exactly six cells, none empty, numbered contiguously. **Every row's `serves` cell cites the
[[Roadmap]] item it delivers as `` `Roadmap.md:<line>` ("its own quoted words") ``** — graded on
the quoted words AND on the line number; after a Roadmap edit, `--relocate` re-derives the numbers.
**Every acceptance cell names a gate or test file that exists, or says `gate to write:`** — a gate
written after the fix can only confirm the fix (gate-independence law 3).

## Active order

2026-10-09 23:30 ET: rows 3 (G0) and 4 (G1) first and in parallel; 5 (G2) starts against a fake adapter matching the `ExperimentResult` schema; 6 waits for G2 except the procedural prop kit.

## The table

| # | task | serves | owner line | acceptance gate | status |
|---|---|---|---|---|---|
| 1 | Bootstrap the agent organisation from the agent-org kit: vault, rules, hooks, role cards, scripts and the org board | `Roadmap.md:24` ("Bootstrap: the agent organisation is installed and its board is green") | overseer | `bash scripts/gates/org-board.sh` exits 0 on the bootstrap commit (skips named, never counted as passes) | open |
| 1.1 | Fill `vault/Vision.md`, the Home NOW block and the first mission from the owner's interview, in the owner's words | Track A | overseer | `node scripts/loop-state.mjs --check` exits 0 (the mission exists, its `state:` is in the vocabulary, its NOW block is fenced) | open |
| 1.2 | Declare every lane, its goal and its branches in `vault/Design/lanes-and-supervisors.md` | Track A | overseer | `node scripts/gates/vault-reachability.mjs` exits 0 with the note reachable | open |
| 1.3 | Write the set-up session note, recording the interview verbatim, and regenerate the hubs and the Index | Track A | overseer | `node scripts/vault-hubs.mjs --check` and `python3 scripts/gen-subject-index.py --check` both exit 0 | open |
| 2 | Each lane named at set-up delivers one result through the real product, judged by the owner by looking | `Roadmap.md:25` ("Every lane named at set-up has produced one result the owner judged by looking") | each lane supervisor | gate to write: per lane, the owner's verdict on a named evidence path, recorded in the lane's `owner-answers.md` | open |
| 3 | G0: Qollab-shaped `echo/` (index.html fragment, main.js, main.css) rendering a Three.js scene, calling a Qiskit Python module via `.callPromising`, and making exactly one `backend.run`; plus a local Qollab-like runner and `echo/QOLLAB_SMOKE_TEST.md` for the owner | `Roadmap.md:29` ("G0 platform proof — Three.js + Python bridge") | platform | gate to write: local runner screenshot of the scene + bridge result + counts; owner's Qollab run recorded in owner-answers.md | open |
| 4 | G1: `echo/quantum/{cloning,entanglement,teleportation}.py` per vision §7 with tests (6+ states × 4 branches, endianness fixture, deferred-measurement circuit labelled honestly) | `Roadmap.md:30` ("G1 quantum accuracy — cloning, Bell marginal and teleportation tests pass") | quantum | gate to write: `echo/tests/test_*.py` exit 0, output quoted | open |
| 5 | G2: playable graybox title → opening → three missions → ending with third-person controls, quest state machine, terminals wired to real local Qiskit | `Roadmap.md:31` ("G2 graybox game — title to finale") | gameplay + story-ui | gate to write: recorded full-run capture in the local runner + state-machine transition tests | open |
| 6 | G3: cinematic art, audio and accessibility pass without breaking G2 | `Roadmap.md:32` ("G3 art and UX complete") | art + story-ui | gate to write: before/after screenshots + FPS at medium quality | open |
| 7 | G4: three consecutive full runs, physics red-team clean, README/project page, credits, file caps | `Roadmap.md:33` ("G4 submission stable — tested Qollab project") | platform + red-team | gate to write: red-team report + file-count/size check script exit 0 | open |
| 8 | G5: 2:40 video script and capture checklist; owner records, uploads and publishes | `Roadmap.md:34` ("G5 video and final submission") | platform (owner publishes) | gate to write: owner confirms public video URL and Qollab URL in owner-answers.md | open |

*Add product rows below these, numbered contiguously, each citing its Roadmap item.*

## Blocked on the owner

Each is one decision only a human can make. Nothing below is an agent's to perform or simulate
(gate-independence law 9). A row blocked on one carries `blocked-on-owner:O<n>`.

| # | the decision | why it blocks | cited |
|---|---|---|---|

## What this plan does NOT include

- *What is deliberately out of scope, and the ruling or reason that put it there.*

## How to work a row

1. Take the row: `node scripts/plan-row.mjs <id>`. Work in your own worktree, on your own branch
   (`lane/<lane>/<slug>`), on your own port.
2. **Write the acceptance gate FIRST and watch it go red** on the unfixed tree.
3. Fix. Then run the **sabotage round** — the assertion, the threshold, and every enabling
   transform under them — against a **disposable** copy, and report the NULLs as loudly as the
   fires (gate-independence law 15).
4. Report → a read-only reviewer **re-derives** the numbers → only on ACCEPT does a lander merge.
5. The lander ticks this row **in the same change**, `done:<sha>`, quoting the gate and its exit
   code, and appends the Roadmap tick at the END of the Roadmap.

## Status roll-up

*Printed, not asserted: re-count it off the `status` column when you change a status, never
increment it by hand. `node scripts/loop-state.mjs` prints the live count.*

| status | rows |
|---|---:|
| `open` | 5 |
| `in-flight:<branch>` | 0 |
| `blocked-on-owner:<Oid>` | 0 |
| `done:<sha>` | 0 |
