#!/usr/bin/env zsh
# The live rehearsal, for whoever holds ~/.config/echo/ionq.env (owner ruling: the key is loaded only
# inside the one command that needs it, never printed, never under echo/). IonQ SIMULATOR only.
# Six jobs, one per process (= one ECHO run each): Bell ideal / aria-1 / forte-1, control ideal / aria-1 / forte-1.
# Then a leak scan that prints only FILE NAMES matching the key's first 8 characters, plus the key's length.
# usage: zsh run-live.sh     Exit: 0 all green · 1 a check failed or a leak · 2 no key file.
set -u
HERE=${0:A:h}
ENVFILE=~/.config/echo/ionq.env
[[ -f $ENVFILE ]] || { echo "REFUSED: $ENVFILE missing; the IonQ step does not run (owner ruling)"; exit 2; }
OUT=$HERE/out/live
rm -f $OUT/results.jsonl
bad=0
for circuit in bell control; do
  for noise in ideal aria-1 forte-1; do
    ( set -a; . $ENVFILE; set +a; python -W ignore $HERE/rehearse.py live --circuit $circuit --noise $noise --out $OUT )
    rc=$?; echo "exit=$rc"; (( rc != 0 )) && bad=1
  done
done
( set -a; . $ENVFILE; set +a
  K=${QISKIT_IONQ_API_TOKEN:-${IONQ_API_KEY:-${IONQ_API_TOKEN:-}}}
  echo "leak scan: key length ${#K}; files containing its first 8 characters (none expected):"
  grep -rlF -- "${K:0:8}" $HERE && exit 1 || echo "  none" ) || bad=1
exit $bad
