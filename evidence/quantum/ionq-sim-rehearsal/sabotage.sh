#!/usr/bin/env zsh
# Falsification round for rehearse.py. Every row copies echo/ (or a fixture) into a fresh temp dir,
# applies ONE edit there, and replays a fixture against the copy. The worktree is never edited.
# A row whose edit did not change the file prints REFUSED. Expected: each row's replay exits 1
# (red) unless the row is marked as an expected null.
# usage: zsh sabotage.sh   (from anywhere; no key, no network)
set -u
HERE=${0:A:h}
WT=${HERE:h:h:h}
PY=${PYTHON:-python}
FX=$HERE/fixtures

row() {  # row <id> <expect red|null> <fixture> <file-in-copy|-> <sed-expr> <description>
  local id=$1 expect=$2 fixture=$3 target=$4 expr=$5 desc=$6
  local tmp=$(mktemp -d)
  cp -R $WT/echo $tmp/echo
  cp $fixture $tmp/fx.fixture.json
  if [[ $target != - ]]; then
    cp $tmp/$target $tmp/orig
    sed -i '' -E "$expr" $tmp/$target
    if cmp -s $tmp/orig $tmp/$target; then echo "| $id | REFUSED (edit did not apply) | $desc |"; rm -rf $tmp; return; fi
  fi
  $PY -W ignore $HERE/rehearse.py replay $tmp/fx.fixture.json --out $tmp/out --echo-root $tmp/echo > $tmp/log 2>&1
  local rc=$?
  local fails=$(grep -c '^  FAIL' $tmp/log)
  local verdict
  if [[ $rc == 1 ]]; then verdict=red; elif [[ $rc == 0 ]]; then verdict=green; else verdict="no verdict (exit $rc)"; fi
  local ok=$([[ $verdict == $expect || ( $expect == null && $verdict == green ) ]] && echo as-expected || echo UNEXPECTED)
  echo "| $id | $desc | ${fixture:t} | exit $rc, $fails FAIL | expected $expect: $ok |"
  grep '^  FAIL' $tmp/log | sed 's/^/|    | /; s/$/ | | | |/'
  rm -rf $tmp
}

echo "| row | sabotage | fixture | replay | verdict |"
echo "|---|---|---|---|---|"
row S0 null  $FX/synth-control-ideal.fixture.json  -  '' 'control: no edit (the copy itself must stay green)'
row S1 red   $FX/synth-control-ideal.fixture.json  echo/quantum/qollab_job.py 's/key\[-1 - clbit\]/key[clbit]/' 'parser reads clbit 0 from the LEFT of the key'
row S1b null $FX/synth-bell-ideal.fixture.json     echo/quantum/qollab_job.py 's/key\[-1 - clbit\]/key[clbit]/' 'same reversal, Bell run (00/11 are symmetric: the Bell run alone cannot see it)'
row S2 red   $FX/synth-control-forte-1.fixture.json echo/quantum/qollab_job.py 's/^QUBIT_OF_CLBIT = \(0, 1\)/QUBIT_OF_CLBIT = (1, 0)/' 'clbit<-qubit map swapped'
row S3 null  $FX/synth-control-ideal.fixture.json  echo/quantum/qollab_job.py 's/^KEY_QUBITS = \[1, 0\]/KEY_QUBITS = [0, 1]/' 'key order flipped AND declared in keyQubits (self-consistent, not a defect)'
row S4 red   $FX/synth-bell-ideal.fixture.json     echo/quantum/qollab_job.py 's/^        backend_name = _backend_label\(backend_name\)$/        backend_name.run(build_backend_verification_circuit(), shots=256); backend_name = _backend_label(backend_name)/' 'Python submits a job of its own while reading the counts (the one submit site is bridge.js)'
row S5 red   $FX/synth-control-ideal.fixture.json  fx.fixture.json 's/"1": 1.0/"2": 1.0/' 'server reports X(q0) in histogram bit 1 (an MSB-first IonQ convention)'
row S6 red   $FX/synth-bell-aria-1.fixture.json    fx.fixture.json 's/"1": 0.02/"1": 0.0/; s/"2": 0.02/"2": 0.0/; s/"0": 0.49/"0": 0.51/; s/"3": 0.47/"3": 0.49/' 'noisy run with no 01/10 at all (noise check must not be vacuous)'
row S7 red   $FX/synth-bell-ideal.fixture.json     fx.fixture.json 's/"0": 0.5/"0": 0.45, "1": 0.05/' 'ideal run that leaks into 01'
row S8 null  $FX/synth-bell-ideal.fixture.json     fx.fixture.json 's/"qiskit_header": "[^"]*"/"qiskit_header": null/' 'IonQ echoes no qiskit_header: qiskit-ionq falls back to the identity map, which IS the map of this circuit (predicted null)'
