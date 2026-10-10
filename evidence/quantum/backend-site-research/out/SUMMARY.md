# backend-site-research round — 2026-10-10 00:40 EDT — LOCAL RUNNER (ionq-mock), not Qollab

| tag | variant | predicted | exit | runner JS counter | python spy | failing checks |
|---|---|---|---|---|---|---|
| A-1 | A | green | 0 | 1 | 1 | - |
| A-2 | A | green | 0 | 1 | 1 | - |
| A-3 | A | green | 0 | 1 | 1 | - |
| A-control | A-control | green | 0 | 1 | 1 | - |
| B-baseline | B-baseline | red(JS-counter-blind) | 1 | 0 | 1 | runner's own JS-side counter: exactly 1 backend.run |
| B-baseline-control | B-baseline-control | red(JS-counter-blind) | 1 | 0 | 1 | runner's own JS-side counter: exactly 1 backend.run |
| sab-no-memo | A-sab-no-memo | red | 1 | 2 | 1 | runner's own JS-side counter: exactly 1 backend.run;runner refused nothing (IonQ one-job mock);verify asked twice: the second call is the same promise |
| sab-python-also-runs | A-sab-python-also-runs | red | 1 | 1 | 2 | Python-side spy (BasicSimulator.run): exactly 1 job |
| sab-parse-left-control | A-control-sab-parse-left | red | 1 | 1 | 1 | delivered counts decode (via keyQubits) to q0=1, q1=0 on every shot |
| sab-parse-left-bell | A-sab-parse-left | null(Bell-symmetric) | 0 | 1 | 1 | - |
