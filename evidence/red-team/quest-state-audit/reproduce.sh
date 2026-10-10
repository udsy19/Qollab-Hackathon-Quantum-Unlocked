#!/usr/bin/env bash
# Fresh export of the audited commits, then baseline + sabotage. Exit: harness verdicts (0/1/2).
# Usage: bash reproduce.sh [gameplay-ref] [platform-ref]   (defaults: d5ec620 6378677)
set -u
GP=${1:-d5ec620}; PF=${2:-6378677}
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(git -C "$HERE" rev-parse --show-toplevel)
T=$(mktemp -d); mkdir -p "$T/gp" "$T/pf"
git -C "$REPO" archive "$GP" echo | tar -x -C "$T/gp"
git -C "$REPO" archive "$PF" echo | tar -x -C "$T/pf"
echo "== audited: gameplay $GP, platform $PF, export $T"
node "$HERE/run.mjs" --game "$T/gp" --contracts "$T/pf"; echo "run.mjs exit=$? (1 expected on d5ec620/6378677: 8 red)"
node "$HERE/sabotage.mjs" --game "$T/gp" --contracts "$T/pf"; echo "sabotage.mjs exit=$? (0 = every scenario as expected)"
