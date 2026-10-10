#!/usr/bin/env bash
# Sabotage round for the two tests edited by tests-caps-clean (gate-independence laws 10 and 15).
# Every mutation is applied to a DISPOSABLE copy of echo/ in a temp dir; the worktree is never touched.
# Each case must turn its target test RED. Exit 0 only if every sabotage went red AND the unmutated
# control copy is green (so a red cannot come from the copy step itself).
# Usage: bash evidence/quantum/tests-caps-clean/sabotage.sh [python]
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PY="${1:-${PY:-python3}}"
T1="tests/test_qollab_job.py::test_module_never_creates_or_names_a_backend"
T2="tests/test_qollab_job.py::test_ionq_histogram_mapping_reads_the_flipped_qubit"
fail=0

run_case() { # name, test id, expected (green|red), mutation "ANCHOR=>REPLACEMENT" or "APPEND=>CODE" or ""
  local name="$1" test="$2" want="$3" mut="$4" tmp
  tmp="$(mktemp -d)"
  cp -R "$ROOT/echo" "$tmp/echo"
  if [ -n "$mut" ]; then
    "$PY" - "$tmp/echo/quantum/qollab_job.py" "$mut" <<'EOF' || { echo "MUTATION FAILED TO APPLY: $name"; exit 2; }
import sys
path, mut = sys.argv[1], sys.argv[2]
src = open(path).read()
old, new = mut.split("=>", 1)
if old == "APPEND":
    src += "\n" + new + "\n"
else:
    assert old in src, f"anchor not found: {old!r}"
    src = src.replace(old, new, 1)
open(path, "w").write(src)
EOF
  fi
  (cd "$tmp/echo" && "$PY" -m pytest -q -p no:cacheprovider "$test" >"$tmp/out.txt" 2>&1)
  local rc=$? got line
  [ $rc -eq 0 ] && got=green || got=red
  line="$(grep -E 'passed|failed|error|skipped' "$tmp/out.txt" | tail -1)"
  if [ "$got" = "$want" ]; then echo "OK    $name: $got (pytest exit $rc) | $line"
  else echo "NULL  $name: wanted $want, got $got (pytest exit $rc) | $line"; fail=1; fi
  # a skip is not a pass and not a red: the mapping test must actually run
  if grep -q skipped "$tmp/out.txt"; then echo "NULL  $name: test was SKIPPED"; fail=1; fi
  rm -rf "$tmp"
}

run_case "control (no mutation), T1"              "$T1" green ""
run_case "control (no mutation), T2"              "$T2" green ""
run_case "hardcode \"ionq_simulator\""            "$T1" red 'APPEND=>_SELECTED = "ionq_simulator"'
run_case "hardcode \"ionq-simulator\" (hyphen)"   "$T1" red 'APPEND=>_SELECTED = "ionq-simulator"'
run_case "read an api_key from the env"           "$T1" red 'APPEND=>import os
API_KEY = os.environ.get("IONQ_API_KEY")'
run_case "apikey (no separator)"                  "$T1" red 'APPEND=>apikey = None'
run_case "a token"                                "$T1" red 'APPEND=>auth_token = None'
run_case "name BasicSimulator"                    "$T1" red 'APPEND=>from qiskit.providers.basic_provider import BasicSimulator'
run_case "key order reversed in interpret_counts" "$T2" red 'for q in KEY_QUBITS)=>for q in reversed(KEY_QUBITS))'
exit $fail
