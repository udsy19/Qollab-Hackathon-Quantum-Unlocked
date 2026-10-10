#!/bin/bash
# Law 10: disposable copy. Adds one §9.2 edge to a COPY of the vision doc, first with a 4-space
# indent, then with the doc's own 2-space indent, and runs the worker's tests against each.
set -u; R=${1:-/tmp/qr-integ}; S=$(mktemp -d /tmp/qr-spec.XXXX)
cp -R "$R/echo" "$R/dev" "$R/ECHO_MASTER_VISION.md" "$S/"; cd "$S"
OLD="  ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS' },"
for IND in "    " "  "; do
  cp "$R/ECHO_MASTER_VISION.md" .
  python3 -c "import sys;p='ECHO_MASTER_VISION.md';s=open(p).read();o=sys.argv[1];assert o in s;open(p,'w').write(s.replace(o,o+'\n'+sys.argv[2]+\"TELEPORT_DRY_RUN: { ABORT: 'LINK_REPAIRED' },\",1))" "$OLD" "$IND"
  cmp -s ECHO_MASTER_VISION.md "$R/ECHO_MASTER_VISION.md" && { echo "sabotage did not apply"; exit 2; }
  echo "indent=${#IND} spaces: $(node --test 'dev/gameplay/tests/*.test.mjs' 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')"
done
