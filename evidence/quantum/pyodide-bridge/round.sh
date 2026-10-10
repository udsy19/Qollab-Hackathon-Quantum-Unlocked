#!/usr/bin/env bash
# The whole graded round, in order: green ×3, the HEAD-Python negative control, every sabotage.
# A sabotage is expected RED (exit 1); a green sabotage is a NULL and is printed as one.
#   round.sh [python-ref-that-conforms]   (default lane/quantum/contract-conformance)
#   PB_RENDERS=<dir>  also copy the green screenshots there
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
PY=${1:-lane/quantum/contract-conformance}
SUM="$HERE/out/SUMMARY.md"
mkdir -p "$HERE/out"
{ echo "| run | scenario | expected | exit | verdict | checks |"; echo "|---|---|---|---|---|---|"; } > "$SUM.tmp"
row() { # tag scenario expected-exit [assemble flags]
  local tag=$1 scen=$2 want=$3; shift 3
  "$HERE/run.sh" "$tag" "$scen" "$@" > "$HERE/out/$tag.log" 2>&1; local code=$?
  local checks; checks=$(grep -Eo '[0-9]+/[0-9]+ checks passed' "$HERE/out/$tag.log" | tail -1)
  local v=OK; [ "$code" = "$want" ] || v=$([ "$want" = 1 ] && [ "$code" = 0 ] && echo NULL || echo UNEXPECTED)
  echo "| $tag | $scen | exit $want | $code | $v | ${checks:-no verdict} |" >> "$SUM.tmp"
  echo "$tag: exit $code (want $want) $v ${checks}"
}
for i in 1 2 3; do PB_SHOT_TO="${PB_RENDERS:+$PB_RENDERS/runner-bridge-harness-final-$i.png}" row "final-$i" conformant 0 --python-from "$PY"; done
row head-python head 0
for s in bare-toJs no-toJs no-memo plain-call swallow-validator; do row "sab-$s" conformant 1 --python-from "$PY" --sabotage "$s"; done
row sab-swallow-validator-head head 1 --sabotage swallow-validator
mv "$SUM.tmp" "$SUM"; cat "$SUM"
