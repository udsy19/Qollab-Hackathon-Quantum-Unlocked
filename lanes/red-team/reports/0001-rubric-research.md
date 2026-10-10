## TL;DR

- Outcome: `vault/Research/judging-rubric.md` (branch `lane/red-team/rubric-research`, one commit). Verbatim quotes with URLs, fetched 2026-10-09 by rendering the pages in headless Chrome and extracting text.
- **The published rubric is only four names: Novelty & Creativity, Technical Execution, Impact Potential, Documentation Quality.** No weights, no scale, no sub-criteria, no tie-breaks anywhere on Qollab's pages. These are written down as NOT FOUND.
- **Our earlier note's "equally weighted" is not on any page.** Treat weights as unknown.
- The one hard gate: the novelty bar. "Panels may score a submission at 0 on these criteria [Novelty & Creativity and Technical Execution], independent of other scores." ECHO must claim "an original analytical or educational contribution" in those words on the page.
- Judges "open the project page, read the description and the code, and press Run on a free simulator". IonQ results "neither add nor subtract points"; only a failed run costs. So the built-in-simulator run, the page and the video are the whole scored surface.
- Descriptors: 5 + 6 + 4 + 5 observable high/low items across the four traits (§7 of the note), each with where to look and the owning lane. ★ marks items that can zero a trait.
- Cheapest gaps first: page copy (run steps, verbatim attribution line, MIT, novelty claim), then a flawless signed-out built-in-simulator run (owner only), then independent recomputation of quantum numbers.
- Not done: hub and index regeneration is left to the loop (see below).

## Vault check

- Read: `vault/AGENTS.md` (via the hook), `vault/Research/qollab-platform-and-submission.md`, `vault/Research/README.md`, `vault/CLAUDE.md`, `ECHO_MASTER_VISION.md` §1.3, §1.4, §12.5, §15, §17, `QOLLAB_DEPLOYMENT.md`. I did **not** read `vault/Index.md`, `Map-code.md`, `Home.md` or any `Sessions/` note beyond the SessionStart output, and did not run `where.mjs` (no code symbols were introduced). Earlier-org `reports/` listed; only the platform note that was ported from it was read.
- Already known and reused: platform, runtime, page fields, one-job-per-run, the novelty floor (the earlier note's §4 already quotes it), and the observation that IonQ remote simulators show "Credits apply" signed out.
- **Stale/wrong in the vault:** `qollab-platform-and-submission.md` §4 says the four traits are "equally weighted". No fetched page says that. I did not rewrite it (a stale note is marked, not edited by me); someone with authority should add `status` / a one-line marker, or fix the sentence.
- Also: `ECHO_MASTER_VISION.md` §15 presents a Claim/Evidence table as the "competition rubric"; it is our reading, not Qollab's.

## Sources (all fetched 2026-10-09, rendered)

- https://qollab.xyz/programs/hackathon/terms: rubric sentence, novelty bar, themes, submission requirements, originality, awards, obligations (attribution), disputes.
- https://qollab.xyz/programs/hackathon/how-it-works (`#judging`, `#faq`): four traits, local then global panel, "Judges open the project page, read the description and the code, and press Run", video rules, browsers, IonQ job note.
- https://qollab.xyz/programs/hackathon: timeline, themes (its judging text points back to how-it-works).
- Checked for judging content and found none: `/programs/hackathon/mentors`, `/learn/docs/write-your-project-page`, `/learn/docs/publish`.
- Web search for a fuller rubric: none found. IonQ's Creative Challenge page is a different event, seen as a snippet only; not fetched.
- Caveat on method: the WebFetch tool returned paraphrase, not verbatim, so every quoted passage was re-taken from the extracted page text (defuddle on Chrome's rendered DOM). Extracted text is in `/tmp/rr/` (not in the repo, not evidence-grade storage); re-derivable.

## Contradictions and gaps (full table in the note §8)

1. C1: "equally weighted" is unsourced in our own earlier note.
2. C2/C3: vision §15 is our guess at the rubric; "Impact" is undefined for the trait but is an industry-hybrid *theme* ("measurable gains" over a classical baseline), so an education game risks a low Impact score unless it shows a measurable learning outcome.
3. C4: the IonQ job earns no points; only a failed run costs. The NOW bar's "one honest selected-backend job" is risk control, not score.
4. C5: IonQ simulators "Credits apply" vs docs "free" is still open (needs a signed-in owner check).
5. C6/C7: accessibility is only "industry best practices" (no level named); Safari/iOS cannot run projects, and our docs list no browsers.
6. C8: no theme is named in the vision docs.

## What I did not do or could not verify

- The signed-in submission form (video URL, repo, theme, disclosure fields) is behind login; not seen.
- Nothing ran on Qollab, IonQ or a local runner; this is documentation research only.
- No screenshots were produced (text research); `renders/rubric-research/` is empty.
- I did not run `node scripts/vault-hubs.mjs` or `python3 scripts/gen-subject-index.py`. My worker rules say never commit generated hubs / Map / Index (the loop regenerates them after merge). `vault-hubs.mjs --check` reports `vault/Research/README.md` and `vault/Map.md` STALE, which is exactly my new note being unlisted. The brief asked for the link; the worker rules forbid committing it. Supervisor: confirm which wins.
- Descriptors in §7 are our reading of the sponsors' words, not a published scale, and are labelled so. No sabotage/falsification round applies (no gate was written).

## Questions for the owner

- **Q1.** Which theme should ECHO declare at submission: Quantum Unlocked (teaching game; vision's framing) or Quantum Playground, or both? Theme only affects "Best of theme" specialty eligibility.
- **Q2.** The terms say projects "cover one or more" themes. Does the submission form allow two? (Not found on any public page.)
- **Q3.** When signed in, what fields does `/programs/hackathon/register` show for a submission (video URL, repo, theme, disclosure)? Carried from the earlier note.
- **Q4.** Which accessibility standard should the page claim (suggest WCAG 2.2 AA, stated explicitly), since Qollab names none?
- **Q5.** May `qollab-platform-and-submission.md` §4 "equally weighted" be corrected? (Not a protected path, but it is another lane's work.)

## Next for the supervisor (read last)

1. Decide hub/index regeneration (see above) and have the loop link `Research/judging-rubric`.
2. Hand red-team scorers §7 as the frame, and state in their briefs that weights are unknown, so scores should be reported per trait, not as a weighted total.
3. Route D1/D2/N1 (page copy) to the platform lane now; it is the cheapest gap and protects both zeroable traits.
4. Get Q1 and Q4 answered; the page copy depends on them.
