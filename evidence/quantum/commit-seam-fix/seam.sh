#!/usr/bin/env bash
# Runs the reviewer's seam check (seam.mjs + engine_dump.py, copied VERBATIM from
# lane/quantum/engine-bridge-review d76271c) on THIS tree's engine, against contracts.js from
# CONTRACTS_REF (default main) and missionRules.js from GAMEPLAY_REF (default world-v2-port tip).
# Usage: bash seam.sh [echo-root]   — exit = seam.mjs's exit (0 green, 1 red).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(git -C "$HERE" rev-parse --show-toplevel)"
ECHO="${1:-$ROOT/echo}"
CONTRACTS_REF="${CONTRACTS_REF:-main}"; GAMEPLAY_REF="${GAMEPLAY_REF:-lane/gameplay/gameplay-world-v2-port}"
W="$(mktemp -d)"; mkdir -p "$W/game"
git -C "$ROOT" show "$CONTRACTS_REF:echo/contracts.js" > "$W/contracts.js" || exit 2
git -C "$ROOT" show "$GAMEPLAY_REF:echo/game/missionRules.js" > "$W/game/missionRules.js" || exit 2
echo "contracts $CONTRACTS_REF@$(git -C "$ROOT" rev-parse --short "$CONTRACTS_REF") gameplay $GAMEPLAY_REF@$(git -C "$ROOT" rev-parse --short "$GAMEPLAY_REF") engine $ECHO (tree HEAD $(git -C "$ROOT" rev-parse --short HEAD)$(git -C "$ROOT" diff --quiet HEAD -- echo || echo '+dirty'))"
PYTHONDONTWRITEBYTECODE=1 python "$HERE/engine_dump.py" "$ECHO" > "$W/dump.json" || exit 2
node "$HERE/seam.mjs" "$W" "$W/dump.json"
