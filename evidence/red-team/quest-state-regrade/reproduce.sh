#!/usr/bin/env bash
# Fresh git-archive export of the audited product commits, then the quest-state harness on each
# composition, compared check by check with the committed baselines, then the sabotage round.
# Works from a `git archive` export of this branch: the product trees come from --repo, never from
# the directory this script sits in.
#
#   bash reproduce.sh [--repo <path>] [--regen] [--no-sabotage]
#     --repo   a clone holding the audited commits (default: the repo this script is in, if any)
#     --regen  re-dump the real engine results from quantum $QU with $PY (needs qiskit), and diff them
#              against the committed JSON; without it the committed JSON is used
#   refs: GP=7c4741b PF=f08dd0b QU=f7efb92 OLD_GP=d5ec620 OLD_PF=6378677 (override via env)
#   exit 0 every number matches the committed outputs · 1 a mismatch · 2 refused (could not run)
set -u
GP=${GP:-7c4741b}; PF=${PF:-f08dd0b}; QU=${QU:-f7efb92}; OLD_GP=${OLD_GP:-d5ec620}; OLD_PF=${OLD_PF:-6378677}
PY=${PY:-python3}
HERE=$(cd "$(dirname "$0")" && pwd); AUDIT="$HERE/../quest-state-audit"; OUT="$HERE/out"
REPO=""; REGEN=0; SAB=1
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO=$2; shift 2 ;;
    --regen) REGEN=1; shift ;;
    --no-sabotage) SAB=0; shift ;;
    *) echo "REFUSED: unknown argument $1" >&2; exit 2 ;;
  esac
done
if [ -z "$REPO" ]; then REPO=$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null) || REPO=""; fi
if [ -z "$REPO" ]; then echo "REFUSED: not inside a git repo; pass --repo <clone with $GP $PF $QU $OLD_GP $OLD_PF>" >&2; exit 2; fi
for ref in "$GP" "$PF" "$OLD_GP" "$OLD_PF"; do
  git -C "$REPO" cat-file -e "$ref^{commit}" 2>/dev/null || { echo "REFUSED: $ref not in $REPO" >&2; exit 2; }
done

T=$(mktemp -d)
ex() { mkdir -p "$2" && git -C "$REPO" archive "$1" echo | tar -x -C "$2" || { echo "REFUSED: export of $1 failed" >&2; exit 2; }; }
ex "$GP" "$T/ship"; ex "$PF" "$T/pf"; ex "$GP" "$T/gp-own"; ex "$OLD_GP" "$T/old-gp"; ex "$OLD_PF" "$T/old-pf"
# The shipped composition: gameplay's echo/game/ under platform's echo/contracts.js (gameplay imports ../contracts.js).
cp "$T/pf/echo/contracts.js" "$T/ship/echo/contracts.js"
echo "== export $T: gameplay $GP + platform $PF (ship), $GP own contracts, $OLD_GP + $OLD_PF (baseline 0003)"

RESULTS="$OUT/real-results-$QU.json"
if [ "$REGEN" = 1 ]; then
  git -C "$REPO" cat-file -e "$QU^{commit}" 2>/dev/null || { echo "REFUSED: $QU not in $REPO" >&2; exit 2; }
  ex "$QU" "$T/qu"
  ECHO_ROOT="$T/qu/echo" "$PY" -I "$HERE/dump_regrade.py" > "$T/results.json" || { echo "REFUSED: dump_regrade.py failed" >&2; exit 2; }
  if cmp -s "$T/results.json" "$RESULTS"; then echo "real results re-dumped from $QU: byte-identical to the committed JSON"; else echo "MISMATCH: re-dumped real results differ from $RESULTS"; RESULTS="$T/results.json"; fi
fi

bad=0
grade() { # label game contracts committed-json
  node "$AUDIT/run.mjs" --game "$2" --contracts "$3" --results "$RESULTS" --json "$T/$1.json" > "$T/$1.txt"; local rc=$?
  [ $rc = 2 ] && { echo "REFUSED: run.mjs on $1"; cat "$T/$1.txt"; exit 2; }
  tail -1 "$T/$1.txt" | sed "s/^/$1: /"
  node -e '
    const [a, b] = process.argv.slice(1).map((f) => JSON.parse(require("fs").readFileSync(f, "utf8")).map((c) => `${c.id} ${c.verdict}`));
    const d = a.filter((x) => !b.includes(x)).concat(b.filter((x) => !a.includes(x)).map((x) => `committed: ${x}`));
    if (d.length) { console.log("MISMATCH vs committed:\n  " + d.join("\n  ")); process.exit(1); }
    console.log(`  matches the committed baseline check by check (${a.length} checks)`);' "$T/$1.json" "$4" || bad=1
}
grade "7c4741b+f08dd0b" "$T/ship" "$T/ship" "$OUT/baseline-7c4741b+f08dd0b.json"
grade "d5ec620+6378677" "$T/old-gp" "$T/old-pf" "$OUT/baseline-d5ec620+6378677.json"
grade "7c4741b-own-contracts" "$T/gp-own" "$T/gp-own" "$OUT/variant-7c4741b-own-contracts.json"

if [ "$SAB" = 1 ]; then
  ( cd "$T/ship" && find echo -type f | sort | xargs shasum -a 256 ) > "$T/before.sha256"
  node "$AUDIT/sabotage.mjs" --game "$T/ship" --contracts "$T/ship" --results "$RESULTS" --scenarios "$HERE/scenarios-7c4741b.mjs" --out "$T/sabotage.json" > "$T/sabotage.txt"; rc=$?
  grep -E "scenarios:|^coverage:" "$T/sabotage.txt"
  [ $rc = 0 ] || { echo "MISMATCH: sabotage round exit $rc (see $T/sabotage.txt)"; bad=1; }
  ( cd "$T/ship" && find echo -type f | sort | xargs shasum -a 256 ) | diff -q - "$T/before.sha256" >/dev/null && echo "audited export byte-identical after the round" || { echo "MISMATCH: the round changed the audited export"; bad=1; }
  diff -q "$T/before.sha256" "$OUT/audited-export.sha256" >/dev/null && echo "audited export hashes match out/audited-export.sha256" || { echo "MISMATCH: export hashes differ from out/audited-export.sha256"; bad=1; }
fi
echo "== outputs in $T"
exit $bad
