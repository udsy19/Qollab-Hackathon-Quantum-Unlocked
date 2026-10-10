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

20 cases · 16 red · 4 null · 0 refused
