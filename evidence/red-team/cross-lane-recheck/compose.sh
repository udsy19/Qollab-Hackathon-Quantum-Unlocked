#!/usr/bin/env bash
# Compose the merged echo/ tree the org would land, from PINNED SHAs, by `git archive` (never a
# checkout of another lane's branch). Writes <out>/echo plus <out>/PROVENANCE.tsv (file → lane@sha).
#   bash evidence/red-team/cross-lane-recheck/compose.sh /tmp/clr-merged
# Override pins with MAIN_SHA / QUANTUM_SHA / GAMEPLAY_SHA / PLATFORM_SHA. Exit 0 ok, 2 refused.
set -euo pipefail
OUT=${1:?usage: compose.sh <outdir>}
MAIN_SHA=${MAIN_SHA:-6cc19a6}
QUANTUM_SHA=${QUANTUM_SHA:-d9b42d0}
GAMEPLAY_SHA=${GAMEPLAY_SHA:-c49a922}
PLATFORM_SHA=${PLATFORM_SHA:-43be7d9}
REPO=$(git rev-parse --show-toplevel)

rm -rf "$OUT" && mkdir -p "$OUT/src"/{main,quantum,gameplay,platform} "$OUT/echo"
for pair in "main $MAIN_SHA" "quantum $QUANTUM_SHA" "gameplay $GAMEPLAY_SHA" "platform $PLATFORM_SHA"; do
  set -- $pair
  git -C "$REPO" cat-file -e "$2^{commit}" 2>/dev/null || { echo "REFUSED: $1 sha $2 not found" >&2; exit 2; }
  git -C "$REPO" archive "$2" echo | tar -x -C "$OUT/src/$1"
done

: > "$OUT/PROVENANCE.tsv"
take() {  # take <lane> <sha> <path under echo/>
  local src="$OUT/src/$1/echo/$3"
  [ -e "$src" ] || { echo "REFUSED: $1@$2 has no echo/$3" >&2; exit 2; }
  mkdir -p "$OUT/echo/$(dirname "$3")"
  cp -R "$src" "$OUT/echo/$3"
  (cd "$OUT/echo" && find "$3" -type f) | while read -r f; do printf '%s\t%s@%s\n' "echo/$f" "$1" "$2"; done >> "$OUT/PROVENANCE.tsv"
}
# The brief's composition: main's contracts, quantum's engine and tests, gameplay's game/, platform's shell.
take main "$MAIN_SHA" contracts.js
take main "$MAIN_SHA" CONTRACTS.md
take quantum "$QUANTUM_SHA" quantum
take quantum "$QUANTUM_SHA" tests
take gameplay "$GAMEPLAY_SHA" game
take platform "$PLATFORM_SHA" main.js
take platform "$PLATFORM_SHA" index.html
# optional shell files: newer platform tips dropped them; their absence is recorded, not refused
for f in main.css requirements.txt; do
  if [ -e "$OUT/src/platform/echo/$f" ]; then take platform "$PLATFORM_SHA" "$f"; else printf 'echo/%s\tABSENT@platform@%s\n' "$f" "$PLATFORM_SHA" >> "$OUT/PROVENANCE.tsv"; fi
done
# platform also ships echo/quantum/smoke.py (G0 smoke); quantum owns echo/quantum/, so it is added
# only if quantum does not have it, and recorded so a collision is visible.
if [ -e "$OUT/src/platform/echo/quantum/smoke.py" ] && [ ! -e "$OUT/echo/quantum/smoke.py" ]; then
  cp "$OUT/src/platform/echo/quantum/smoke.py" "$OUT/echo/quantum/smoke.py"
  printf 'echo/quantum/smoke.py\tplatform@%s\n' "$PLATFORM_SHA" >> "$OUT/PROVENANCE.tsv"
fi
sort -o "$OUT/PROVENANCE.tsv" "$OUT/PROVENANCE.tsv"
echo "composed $(wc -l < "$OUT/PROVENANCE.tsv" | tr -d ' ') files into $OUT/echo"
