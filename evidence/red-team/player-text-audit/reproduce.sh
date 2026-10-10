#!/usr/bin/env bash
# Player-text audit, end to end on a fresh `git archive` export. Usage: bash reproduce.sh [story-ui-ref]  (default 320613e)
# Expected on 320613e: good fixture exit 0 (0 findings) · bad fixture exit 1 (37) · baseline exit 1 (9: HIGH 3, MED 4, LOW 2)
#                      sabotage exit 0 (58/58 as expected) · branch_truth exit 0 (16/16 true)
set -u
REF=${1:-320613e}
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(git -C "$HERE" rev-parse --show-toplevel)
PY=${PY:-/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python}
T=$(mktemp -d); git -C "$REPO" archive "$REF" echo | tar -x -C "$T" || { echo "REFUSED: cannot export $REF"; exit 2; }
echo "== audited: story-ui $REF ($(git -C "$REPO" rev-parse --short "$REF")), export $T"
node "$HERE/check.mjs" --root "$HERE/fixtures/good" --quiet; echo "good fixture exit=$? (expect 0)"
node "$HERE/check.mjs" --root "$HERE/fixtures/bad" --out "$HERE/out/bad-fixture" --quiet; echo "bad fixture exit=$? (expect 1)"
node "$HERE/check.mjs" --root "$T" --out "$HERE/out/baseline-$REF" --quiet; echo "baseline exit=$? (expect 1)"
node "$HERE/sabotage.mjs" --root "$T" --out "$HERE/out" | tail -1; echo "sabotage exit=${PIPESTATUS[0]} (expect 0)"
if [ -x "$PY" ]; then
  J=$(node -e "import('$T/echo/data/objectives.js').then(m=>console.log(JSON.stringify(m.TELEPORT_FAILURE_CASES)))")
  echo "$J" | "$PY" -I "$HERE/branch_truth.py" > "$HERE/out/branch_truth.md"; echo "branch_truth exit=$? (expect 0): $(tail -1 "$HERE/out/branch_truth.md")"
  echo "$J" | sed 's/"01:00":\["missing_X"\]/"01:00":["missing_Z"]/' | "$PY" -I "$HERE/branch_truth.py" >/dev/null; echo "branch_truth sabotage (01:00 → missing_Z) exit=$? (expect 1)"
else echo "branch_truth SKIPPED (exit 77): no python at $PY"; fi
rm -rf "$T"
