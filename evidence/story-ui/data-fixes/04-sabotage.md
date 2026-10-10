| sabotage | verdict | first failure line |
|---|---|---|
| overlong beat | RED | FAIL story.STORY.CLONE_SUPERPOSITION_FAILED[0]: does not fit 2×42: 3 lines — "Two outputs. Not two copies. And this sentence keeps going wel |
| hint removed (ladder of 2) | RED | FAIL objectives.HINTS.relay_bell: must have exactly 3 hints, has 2 |
| hint ladder out of order | RED | FAIL objectives.HINTS.clone_superposition[0]: hint 1 must be kind "inspect", is "resource" |
| faster-than-light line | RED | FAIL story.STORY.RELAY_BELL_CREATED[0].text: faster-than-light signalling (§2.4): "The pair links us faster than light." |
| swapped correction rule | RED | FAIL objectives.HINTS.teleport_correct.ladder[2].text: swapped correction rule (§7.1: X iff m1=1, Z iff m0=1): "Apply Z if m1 = 1 and X if m |
| swapped bit names | RED | FAIL objectives.HINTS.teleport_correct.ladder[0].text: swapped bit names (§7.1: m0 = source readout, m1 = local Bell half): "Read the two bi |
| objective key misspelt | RED | FAIL objectives.OBJECTIVES.LINK_REPAIRED: state the player sees has no objective {number, text} |
| speaker not in cast | RED | FAIL story.STORY.TELEPORT_DRY_RUN_PASSED[3]: speaker "Narrator" is not in the §2.2 cast (RIN, MICA, VEGA, MIRROR) |
| misconception left uncorrected | RED | FAIL story.STORY.ENDING[2]: misconception "But you still have it, right?" is not corrected by a negating next beat |
| fake verbatim claim | RED | FAIL story.STORY.CLONE_UNDERSTOOD[1]: claims src §4.2 but its text is not in the vision verbatim: "Then we stop trying to make three." |
| matter teleportation | RED | FAIL story.STORY.TELEPORT_DRY_RUN_PASSED[3].text: material teleportation (§2.4): "Teleport me to the vault." |
| entanglement signals (plain verb) | RED | FAIL story.STORY.TELEPORT_COMMITTED[2].text: entanglement transmits the message (§2.4): "The entangled pair delivered the token to the vault |
| certified randomness | RED | FAIL teachback.CREDITS[6].text: certified/physical quantum randomness from a simulator (§2.4, §7.5): "Every bit was certified random." |
| entanglement signals (verb outside list) | GREEN (null) |  |
| entanglement claim excused by an unrelated "no" | GREEN (null) |  |
| clone claim, "perfect copy" | RED | FAIL story.STORY.CLONE_SUPERPOSITION_FAILED[0].text: a working copy of a quantum state (§2.4): "The booth made a perfect copy of the \|+> sta |
| clone claim, other words | GREEN (null) |  |
| randomness claim, other words | GREEN (null) |  |
| wrong marginal in new text | RED | FAIL objectives.FAILURES.bell_signalling.sender_X: receiver-only split other than 50% / 50% (§7.3): "The receiver alone now sees 75% / 25%." |
| wrong marginal in a verbatim line | RED | FAIL story.STORY.RELAY_SEND_FAILED[0].text: receiver-only split other than 50% / 50% (§7.3): "Receiver-only data: 75% / 25%." |
| credits: one character off the ruling | RED | FAIL teachback.CREDITS.team: must be exactly "Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa" |
| credits: an email added | RED | FAIL teachback.CREDITS: no emails in the credits |
| m0 label in the old order | RED | FAIL objectives.TERMINALS.teleport_terminal.m0Label: must be exactly "SOURCE READOUT m0", is "m0  SOURCE READOUT" |
| m1 label in the old order | RED | FAIL objectives.TERMINALS.teleport_terminal.m1Label: must be exactly "LOCAL BELL-HALF READOUT m1", is "m1  LOCAL BELL-HALF READOUT" |
| dry run uses a partner at the vault | RED | FAIL story.STORY.TELEPORT_DRY_RUN[1].text: dry runs never use a vault partner: "Three slots: test source, your Bell half, and its partner at |
| dry run puts a half in the vault (other words) | RED | FAIL story.STORY.TELEPORT_DRY_RUN[1].text: dry-run text puts the vault in the experiment: "The other waits in the vault." |
| zero-countdown beats removed | RED | FAIL story.MOMENTS.countdown_zero: must be a non-empty array of beats |
| zero beat no longer says held (Mica still says holding) | RED | FAIL story.MOMENTS.countdown_zero: the zero beat must say the grid isolation is held |
| HUD held status removed | RED | FAIL objectives.HUD.countdownHeld: the HUD needs a held status line for 00:00 |
| timer ends the game | RED | FAIL story.MOMENTS.countdown_zero[1].text: the timer never ends the game (§1): "The clock hit zero. Game over, Rin." |
| 00 dry-run beat removed | RED | FAIL story.MOMENTS.teleport_dry_run_00: a correct 00 dry run must say it does not unlock COMMIT |
| commit_locked drops the non-00 rule | RED | FAIL objectives.FAILURES.teleportation.commit_locked: must say the passing dry run needs bits other than 00 |
| Rin given a pronoun | RED | FAIL story.MOMENTS.countdown_zero[1].text: gendered pronoun: "The clock hit zero. Tell Rin she has to hurry." |
| teach-back with two right choices | RED | FAIL teachback.TEACHBACK[0]: needs exactly 1 right and 2 wrong choices |
| teach-back choice without a why | RED | FAIL teachback.TEACHBACK[1].choices[0]: every choice needs a why |
| teach-back scored | RED | FAIL teachback.TEACHBACK[2].choices[0].why: teach-back is unscored: "Yes. +1 point. Two bits pick one of four fixes." |
| captions can be turned off | RED | FAIL objectives.HUD.tooltips.pause: captions are always on: "ESC  PAUSE (turn off captions here)" |
| branch: extra_X claims "already right" again | RED | FAIL objectives.TELEPORT_FAILURE_CASES['00:11']: extra_X says the rest was already right, but the receiver holds XZ·state: "X was on but m1  |
| branch: missing_Z claims "left phase-flipped" again | RED | FAIL objectives.TELEPORT_FAILURE_CASES['10:10']: missing_Z says the receiver is left phase-flipped, but it holds XZ·state: "m0 = 1 but Z was |
| branch: both-wrong case names only one flip | RED | FAIL objectives.TELEPORT_FAILURE_CASES['11:00']: receiver is left with a phase flip (fidelity 0.149373) and no line names it |
| branch: failure line on a correct plan | RED | FAIL objectives.TELEPORT_FAILURE_CASES['01:10']: receiver holds the test state (fidelity 1) but failure lines are shown |
| branch: wrong line for the case | RED | FAIL objectives.TELEPORT_FAILURE_CASES['01:00']: extra_X is false here (m0=0 m1=1 X=0 Z=0, receiver holds X·state): "X was on but m1 = 0. Th |
| branch: a case deleted | RED | FAIL objectives.TELEPORT_FAILURE_CASES['10:01']: every one of the 16 (bits, plan) cases needs an entry |
| branch: unjudged failure line added | RED | FAIL objectives.FAILURES.teleportation.no_corrections: a failure line this gate has no claim record for cannot be judged |
| branch: line text off its claim record | RED | FAIL objectives.FAILURES.teleportation.extra_X: text no longer matches its claim record: "X was on but m1 = 1. That X added a bit flip the b |
| truth: m0/m1 swapped in the projection | RED | FAIL objectives.TELEPORT_FAILURE_CASES['01:00']: receiver is left with a phase flip (fidelity 0.176668) and no line names it |
| truth: plan applies Z where X belongs | RED | FAIL objectives.TELEPORT_FAILURE_CASES['00:10']: receiver is left with a phase flip (fidelity 0.176668) and no line names it |
| truth: python missing | REFUSED by gate (exit 2) | REFUSED: branch_truth.py did not run (/nonexistent/python, exit null): spawnSync /nonexistent/python ENOENT |

48 cases · 43 red · 4 null · 0 refused
