#!/usr/bin/env bash
# Sabotage gameplay's teleport verdict on a disposable export; run gameplay's OWN node tests.
#   bash sabotage_gameplay.sh <git ref>      e.g. lane/gameplay/integration
# Exit 0 = control green and every row applied (verdicts are reported, not asserted); 1 otherwise.
set -u
REF=${1:?ref}; SHA=$(git rev-parse --short "$REF"); BAD=0
row() { # id, file, old, new
  local d; d=$(mktemp -d); git archive "$REF" echo dev ECHO_MASTER_VISION.md | tar -x -C "$d"
  if [ -n "$3" ]; then
    python3 - "$d/$2" "$3" "$4" <<'PY' || { echo "| \`$1\` | REFUSED (pattern not exactly once) |"; BAD=1; rm -rf "$d"; return; }
import sys, pathlib
p, old, new = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
t = p.read_text()
if t.count(old) != 1: sys.exit(1)
p.write_text(t.replace(old, new))
PY
  fi
  local out rc; out=$(cd "$d" && node --test dev/gameplay/tests/*.test.mjs 2>&1); rc=$?
  local sum; sum=$(echo "$out" | grep -E "^ℹ (pass|fail)" | tr '\n' ' ')
  [ "$1" = control ] && [ $rc -ne 0 ] && BAD=1
  local v="RED (exit $rc)"; [ $rc -eq 0 ] && v="GREEN"; [ $rc -eq 0 ] && [ "$1" != control ] && v="GREEN **NULL**"
  echo "| \`$1\` | $v | $sum |"; rm -rf "$d"
}
echo "gameplay sabotage on $REF @ $SHA"; echo "| mutation | gameplay's own tests | summary |"; echo "|---|---|---|"
R=echo/game/missionRules.js
row control "" "" ""
row swap_xz_rule $R "return { applyX: m1 === 1, applyZ: m0 === 1 };" "return { applyX: m0 === 1, applyZ: m1 === 1 };"
row rule_check_removed $R "  if (r.parameters.correctionX !== want.applyX || r.parameters.correctionZ !== want.applyZ) {" "  if (false) {"
row threshold_0_9 $R "const FIDELITY_OK = 0.999999;" "const FIDELITY_OK = 0.9;"
row fidelity_check_removed $R "  if (r.fidelity < FIDELITY_OK) return" "  if (false) return"
row token_guard_removed $R "    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');" "    if (false) return none('x');"
exit $BAD
