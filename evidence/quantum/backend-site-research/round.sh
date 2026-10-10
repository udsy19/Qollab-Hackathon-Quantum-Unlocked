#!/usr/bin/env bash
# The full round: three consecutive Option A greens, the X-on-q0 control, the current route (B) as
# baseline, and every sabotage. Each run is a fresh disposable copy and a fresh browser profile.
#   round.sh        BS_PORT (default 5193)
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
S="$HERE/out/SUMMARY.md"
mkdir -p "$HERE/out"
{ echo "# backend-site-research round — $(date '+%Y-%m-%d %H:%M %Z') — LOCAL RUNNER (ionq-mock), not Qollab"; echo; echo "| tag | variant | predicted | exit | runner JS counter | python spy | failing checks |"; echo "|---|---|---|---|---|---|---|"; } > "$S"
while read -r TAG VARIANT PRED; do
  [ -z "$TAG" ] && continue
  bash "$HERE/run.sh" "$TAG" "$VARIANT" > "$HERE/out/$TAG.log" 2>&1; CODE=$?
  LINE=$(grep -E 'checks passed' "$HERE/out/$TAG.log" | sed -E 's/.*runner JS counter ([0-9]+) · python spy ([0-9]+)/\1|\2/')
  FAILS=$(grep -E '^FAIL' "$HERE/out/$TAG.log" | sed -E 's/^FAIL  //; s/  —.*//' | paste -sd ';' -)
  echo "| $TAG | $VARIANT | $PRED | $CODE | ${LINE%%|*} | ${LINE##*|} | ${FAILS:--} |" >> "$S"
done <<'RUNS'
A-1 A green
A-2 A green
A-3 A green
A-control A-control green
B-baseline B-baseline red(JS-counter-blind)
B-baseline-control B-baseline-control red(JS-counter-blind)
sab-no-memo A-sab-no-memo red
sab-python-also-runs A-sab-python-also-runs red
sab-parse-left-control A-control-sab-parse-left red
sab-parse-left-bell A-sab-parse-left null(Bell-symmetric)
RUNS
cat "$S"
