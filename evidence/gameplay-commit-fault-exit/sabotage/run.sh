#!/bin/bash
# Sabotage round on a DISPOSABLE copy (gate-independence law 10): each mutation is applied to a
# scratch copy of echo/ + dev/, then the unit tests and the harness playthrough run against it.
# Usage: bash evidence/gameplay-commit-fault-exit/sabotage/run.sh   (from the worktree root)
set -u
ROOT=$(pwd); OUT=$ROOT/evidence/gameplay-commit-fault-exit/sabotage
run() { # name file perl-substitution
  local name=$1 file=$2 sub=$3 tmp; tmp=$(mktemp -d /tmp/gcfe-sab.XXXX)
  # The unit tests read their ground truth from the vision doc (dev/gameplay/tests/spec.mjs).
  cp -R "$ROOT/echo" "$ROOT/dev" "$ROOT/ECHO_MASTER_VISION.md" "$tmp/"
  if [ -n "$sub" ]; then
    perl -0pi -e "$sub" "$tmp/$file"
    if cmp -s "$ROOT/$file" "$tmp/$file"; then echo "$name: MUTATION DID NOT APPLY (refused)"; rm -rf "$tmp"; return; fi
  fi
  (cd "$tmp" && node --test 'dev/gameplay/tests/*.test.mjs' > "$OUT/$name.unit.txt" 2>&1); local u=$?
  local port=$((40000 + RANDOM % 20000))
  (cd "$tmp" && python3 -m http.server $port --bind 127.0.0.1 >/dev/null 2>&1) & local srv=$!; sleep 1
  node "$ROOT/dev/gameplay/playthrough.mjs" $port "$tmp/shots" > "$OUT/$name.playthrough.txt" 2>&1; local p=$?
  kill $srv; rm -rf "$tmp"
  echo "$name: unit exit $u ($( [ $u -ne 0 ] && echo RED || echo green)) · playthrough exit $p ($( [ $p -ne 0 ] && echo RED || echo green)) · $(grep -m1 -o 'Error: .*' "$OUT/$name.playthrough.txt" | cut -c1-140)"
}
# 0. control: the unmutated copy must be green on both, or every red below is the copy's fault
run 0-control-unmutated echo/game/state.js ''
# 1a. the machine stops offering RESTART after a measured refusal
run 1a-machine-no-restart-offer echo/game/state.js 's/restartOffered: true/restartOffered: false/'
# 1b. the terminal stops offering RESTART outside the ending states
run 1b-terminal-no-restart-button dev/gameplay/devTerminal.js 's/ENDING_STATES\.has\(s\) \|\| fault\?\.restartOffered/ENDING_STATES.has(s)/'
# 2a. COMMIT re-arms in the machine after a measured refusal
run 2a-machine-commit-rearms echo/game/state.js 's/if \(commit !== COMMIT_STATUS\.IDLE\) return/if (commit !== COMMIT_STATUS.IDLE \&\& commit !== COMMIT_STATUS.MEASURED_REFUSED) return/'
# 2b. the terminal re-enables the COMMIT button after a measured refusal
run 2b-terminal-commit-button-rearms dev/gameplay/devTerminal.js 's/disabled: busy \|\| machine\.commit !== COMMIT_STATUS\.IDLE, onclick: commit/disabled: busy || machine.commit === COMMIT_STATUS.IN_FLIGHT, onclick: commit/'
# 3. control: no mutation applied must be refused, not reported green
run 3-control-noop echo/game/state.js 's/THIS_STRING_IS_NOT_IN_THE_FILE/x/'
