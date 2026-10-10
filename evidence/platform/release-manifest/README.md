# Release upload manifest — evidence

Branch `lane/platform/release-upload-manifest`. Local tooling only; nothing here ran on Qollab.

| file | command | exit |
|---|---|---|
| `01-fixtures-red-before.txt` | `node tools/assemble-echo/run-fixtures.mjs` with the release fixtures written, before `--release` existed | 1 (5 release fixtures FAIL: unknown argument) |
| `02-real-run.txt` | `node tools/assemble-echo/assemble.mjs --release --out $T/echo --manifest $T/echo.manifest.tsv $(cat pinned-refs.txt)` | 1 (RELEASE RED, 30 files, 9 blockers) |
| `pinned-refs.txt` | the five `lane/*/integration` tips at the time of the run, as `--ref lane=<sha>` | — |
| `upload.manifest.tsv` | the manifest that run wrote (`sha256<TAB>bytes<TAB>path`) | — |
| `03-independent-check.txt` | `find` + `shasum -a 256` + `wc -c` over the output tree (no node), diffed against the manifest | IDENTICAL, 30 lines; tests/ 0, smoke doc 0, README present |
| `04-sabotage.txt` | `node tools/assemble-echo/sabotage.mjs` | 0 (14 mutations, 0 nulls) |
| `05-fixtures-green.txt` | `node tools/assemble-echo/run-fixtures.mjs` | 0 (13/13) |
| `06-caps-without-release.txt` | the same pinned refs assembled WITHOUT `--release`, then `tools/qollab-caps/check.mjs` | 1 (41 files; same single caps red) |

To reproduce the real run exactly (zsh: `${=ARGS}`; bash: `$ARGS`):

```
ARGS=$(cat evidence/platform/release-manifest/pinned-refs.txt)
T=$(mktemp -d); node tools/assemble-echo/assemble.mjs --release --out $T/echo $ARGS; echo $?
find $T/echo -type f | wc -l; find $T/echo -path '*/tests*' -o -name QOLLAB_SMOKE_TEST.md
```
