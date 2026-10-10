# `evidence/red-team/` — red-team lane evidence

The red-team lane edits no product files. Its executable evidence lives here, one directory per
audit. Each one has its own README naming the script that produces or reads it.

- `physics-oracle/`: independent physics ground truth for ECHO's quantum puzzles. Produced and
  read by `evidence/red-team/physics-oracle/sabotage.py` and
  `evidence/red-team/physics-oracle/test_physics_oracle.py`.
