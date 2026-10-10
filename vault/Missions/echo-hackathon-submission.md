---
type: mission
status: current
date: 2026-10-09
updated: 2026-10-09
owner: supervisor
accepted-by: owner
accepted: 2026-10-09
state: running
---

# Mission — ECHO: ONE OF ONE — Qollab × IonQ submission

## NOW

**Accepted by the owner, 2026-10-09.** This mission is in force: `.claude/settings.json` names it in
`ORG_MISSION`, the SessionStart hook prints this block into every session, and
`scripts/loop-guard.sh` gates on this note's `state:`.

**The goal:** Ship a published, runnable Qollab-native Three.js game (echo/) in which a player walks Rin through Nacre City, fails to clone a qubit, learns entanglement alone cannot signal, and teleports the state with a Bell pair + two classical bits + X/Z corrections — every puzzle driven by real Qiskit — plus a public 2–3 min demo video, by Sun 2026-10-11 19:00 ET.

**The bar:** A blind tester finishes title → three missions → ending on Qollab without help and can explain the three teach-back answers; quantum tests pass; one honest selected-backend job; 3 consecutive full runs; ≥30 FPS mid-range laptop (ECHO_MASTER_VISION.md §1.4, §12.5, §17).

**What has NOT worked** (so nobody repeats it): Nothing yet — fresh start (owner, 2026-10-09).

**First moves:** Plan rows 1–2 (`node scripts/plan-row.mjs 1`).

*Everything between `## NOW` and `## ---END-NOW` is printed at the start of every session, so keep
it short, current and in the owner's words. Rewrite it; never append history here.*

## ---END-NOW

## Goal

The end state in one paragraph, and the NOW item on [[Home]] it serves.

## Definition of done

*Owner-edited. One row per property, each with the gate or browser check that proves it.*

| # | property that must hold | gate or browser check that proves it | status |
|---|---|---|---|

## Pre-registration

Before any fix: the observation, the hypothesised cause, the gate that will go RED on the unfixed
tree, and what would falsify the hypothesis (see `.claude/rules/gate-independence.md`).

## Lanes

| lane | supervisor | branch | state |
|---|---|---|---|

## Human gates (an agent may NEVER close these)

- *Acceptance of this mission, the owner's verdict on a result, logins and spend.*

## Log

Newest first. One line per iteration: date · what was tried · verdict · evidence path.
