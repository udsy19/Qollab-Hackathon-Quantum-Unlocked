#!/usr/bin/env bash
# Records the quantum lane's REAL bell_signalling output (Qiskit Statevector + partial_trace) for
# I, X and Z into relay-fixtures.json, so the terminals harness can replay exact_qiskit_local results
# truthfully. The platform contract refuses a documented_preview for bell_signalling (owner ruling:
# the receiver panel is EXACT only), so the relay cannot use the preview stub.
# Usage (worktree root): bash evidence/story-ui/harness/record-relay.sh [ref]
set -euo pipefail
REF="${1:-lane/quantum/integration}"
TMP="$(mktemp -d)"
git archive "$REF" echo/quantum | tar -x -C "$TMP"
PY=/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python
"$PY" -I -c "
import json, sys
sys.path.insert(0, '$TMP/echo')
from quantum.entanglement import bell_signalling
out = {g: bell_signalling(g) for g in ('I', 'X', 'Z')}
out['_provenance'] = {'ref': '$REF', 'commit': '$(git rev-parse --short "$REF")', 'function': 'quantum.entanglement.bell_signalling'}
print(json.dumps(out, indent=1))
" > evidence/story-ui/harness/relay-fixtures.json
rm -rf "$TMP"
echo "recorded from $REF @ $(git rev-parse --short "$REF")"
