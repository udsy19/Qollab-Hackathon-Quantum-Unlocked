#!/usr/bin/env bash
# The whole graded round, in order: green ×3, the lying-engine control, the two head controls (the
# pre-rewire bridge, the pre-hardening Python), then every sabotage.
# A sabotage is expected RED (exit 1); a green sabotage is a NULL and is printed as one.
#   round.sh [python-ref] [old-bridge-ref]   (defaults HEAD, lane/quantum/integration)
#   PB_RENDERS=<dir>  also copy the green screenshots there
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
PY=${1:-HEAD}
OLD_BRIDGE_REF=${2:-lane/quantum/integration}
OLD_PY_REF=lane/quantum/contract-conformance  # the conformant engine from BEFORE hardening
SUM="$HERE/out/SUMMARY.md"
mkdir -p "$HERE/out"
OLD_BRIDGE=$(mktemp /tmp/pb-old-bridge-XXXXXX)
git -C "$REPO" show "$OLD_BRIDGE_REF:echo/quantum/bridge.js" > "$OLD_BRIDGE" || exit 2
{ echo "python $PY@$(git -C "$REPO" rev-parse --short "$PY") · old bridge $OLD_BRIDGE_REF@$(git -C "$REPO" rev-parse --short "$OLD_BRIDGE_REF") · old python $OLD_PY_REF@$(git -C "$REPO" rev-parse --short "$OLD_PY_REF")"; echo
  echo "| run | scenario | expected | exit | verdict | checks |"; echo "|---|---|---|---|---|---|"; } > "$SUM.tmp"
row() { # tag scenario expected-exit [assemble flags]
  local tag=$1 scen=$2 want=$3; shift 3
  "$HERE/run.sh" "$tag" "$scen" "$@" > "$HERE/out/$tag.log" 2>&1; local code=$?
  local checks; checks=$(grep -Eo '[0-9]+/[0-9]+ checks passed' "$HERE/out/$tag.log" | tail -1)
  local v=OK; [ "$code" = "$want" ] || v=$([ "$want" = 1 ] && [ "$code" = 0 ] && echo NULL || echo UNEXPECTED)
  echo "| $tag | $scen | exit $want | $code | $v | ${checks:-no verdict} |" >> "$SUM.tmp"
  echo "$tag: exit $code (want $want) $v ${checks}"
}
for i in 1 2 3; do PB_SHOT_TO="${PB_RENDERS:+$PB_RENDERS/runner-bridge-harness-final-$i.png}" row "final-$i" conformant 0 --python-from "$PY"; done
row fault fault 0 --python-from "$PY" --fault
row head-old-bridge conformant 1 --python-from "$PY" --bridge "$OLD_BRIDGE"
row head-old-python conformant 1 --python-from "$OLD_PY_REF"
for s in bare-toJs no-toJs no-memo plain-call no-theta-passthrough no-latch restart-no-python restart-resets-memo; do
  row "sab-$s" conformant 1 --python-from "$PY" --sabotage "$s"
done
row sab-swallow-validator fault 1 --python-from "$PY" --sabotage swallow-validator --fault
for s in commit-experiment-validator commit-unlatch-consumed; do
  row "sab-$s" fault 1 --python-from "$PY" --sabotage "$s" --fault
done
rm -f "$OLD_BRIDGE"
mv "$SUM.tmp" "$SUM"; cat "$SUM"
