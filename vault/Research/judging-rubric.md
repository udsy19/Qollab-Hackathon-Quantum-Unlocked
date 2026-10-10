---
type: research
status: current
date: 2026-10-09
updated: 2026-10-09
owner: red-team (rubric-research)
tags:
  - qollab
  - hackathon
  - judging
  - rubric
---

# Judging rubric: what the Qollab × IonQ judges say they weigh, and what each trait looks like for ECHO

> [!note] Method and honesty
> Pages were rendered with headless Chrome on **2026-10-09** (qollab.xyz is a Nuxt SPA, so a plain fetch is an empty shell) and extracted with defuddle, so every quote below is copied from the extracted page text, not from a summary. The extracted text was kept outside the repo, in `/tmp/rr/` (`terms.md`, `how-it-works.md`); it is re-derivable by the same two steps. Reuses [[Research/qollab-platform-and-submission]] (platform, runtime, page fields); this note extends it with **judging only**. A web search for a longer rubric (2026-10-09) found none. The only other trace is IonQ's page for the separate *Creative Challenge* (see §6).

## 1. What the judges publish: the whole rubric

**Four named traits. Nothing else is published about them.**

> "All submitted projects will be evaluated by judging panels based on a common rubric focused on Novelty & Creativity, Technical Execution, Impact Potential and Documentation Quality."
> https://qollab.xyz/programs/hackathon/terms (intro, fetched 2026-10-09)

> "Every submission is judged on the same four traits: Novelty & creativity · Technical execution · Impact potential · Documentation quality. Local judges score first. Top scorers advance to a global panel, which re-scores using the same rubric."
> https://qollab.xyz/programs/hackathon/how-it-works#judging ("How judging works", fetched 2026-10-09; the page lists the four traits as bullets)

**NOT FOUND on any Qollab page fetched (terms, how-it-works, hackathon overview, mentors, write-your-project-page, publish):**

| asked | result |
|---|---|
| weights per trait | **Not found.** The earlier note [[Research/qollab-platform-and-submission]] §4 says "equally weighted"; that wording is **not on the pages**. No weight, scale, point total or formula appears. Treat weights as unknown. |
| sub-criteria or descriptors for any trait | **Not found.** Only the novelty bar (§2) says anything about content. |
| tie-breaks | **Not found.** Nothing on ties. The only adjacent text is the disqualification rule that a withdrawn slot "is not backfilled". |
| scoring scale or number of judges | **Not found.** Only "A local panel including a faculty or staff judge, alongside Qollab and IonQ representatives." |
| a "judging" page separate from how-it-works | **Not found.** The terms link `/programs/hackathon/how-it-works#judging`, which is the section quoted above. |
| a Quantum Unlocked-specific rubric | **Not found.** The theme only affects which *specialty award* a project can win (§3). |

## 2. The one hard gate: the novelty bar (can zero two traits)

> "Each submission must go beyond a standard reference implementation or tutorial-level exercise and demonstrate at least one of the following:
> - A novel application or problem context (e.g., applying an existing technique to a specific domain)
> - A technical extension (e.g., noise/error mitigation, parameter optimization, comparative benchmarking)
> - An original analytical or educational contribution (e.g., a genuinely new way of visualizing or explaining a quantum phenomenon)
>
> The judging panel will assess these traits as part of the Novelty & Creativity and Technical Execution rubric criteria. Panels may score a submission at 0 on these criteria, independent of other scores, if it fails to meet this bar."
> https://qollab.xyz/programs/hackathon/terms (Submission requirements)

So **Novelty & Creativity and Technical Execution can each go to 0 regardless of the other scores.** ECHO's claimed category should be the third (educational contribution), with the first as a second leg. The vision (§1.3) already says so; the project page must say it in those words.

## 3. Themes and awards that change what is scored

> "*Quantum Unlocked* — make the hardest ideas in quantum computing click. Quantum computing is full of fascinating ideas that can be difficult to visualize and understand. Pick a timely topic, such as quantum error correction, fault tolerance, quantum networking, or algorithms, and find a creative way to teach it. Build an interactive demo, game, animation, visualization, or GUI that turns a complex concept into something intuitive, engaging, and memorable."

> "*Quantum Playground* — … Build a game, compose music, generate art, design an interactive experience … make quantum science an essential part of the experience, using concepts such as superposition, interference, entanglement, or measurement in a way that goes beyond simply generating randomness."
> both: https://qollab.xyz/programs/hackathon/terms (Submission requirements)

> "Projects that don't fall under one of these themes are still welcome and eligible for placement awards (1st/2nd/3rd and node-level prizes), but will not be eligible for Theme specialty awards."

Theme is optional at registration and declared at submission (hackathon overview and how-it-works; the earlier note records it can be changed until the deadline). The terms say projects "cover one or more of the following themes". Whether a submission may declare **two** themes is **not found** (Q2).

**Awards the traits feed** (terms § Award structure): placement 1st/2nd/3rd locally (only with 10+ projects at the node, otherwise the top 3 advance) and globally; specialty awards **Most Novel / Creative, Best of each of the three themes, Most Impact, Best Documentation**, each $500 + $5,000 compute. "A project can win both a placement prize and a specialty award." A node may advance "up to one project for each of the specialized global awards". Novelty, impact and documentation each have a prize of their own. **Technical Execution has no specialty prize**, so it is scored only inside placement.

## 4. What the judges do, and so what they can observe

> "The project has to be public and runnable on Qollab. Judges open the project page, read the description and the code, and press Run on a free simulator."
> https://qollab.xyz/programs/hackathon/how-it-works#faq ("Does all my code have to be on Qollab?")

> "Judges run every project on a free local simulator, and results from IonQ's simulators or hardware neither add nor subtract points."
> https://qollab.xyz/programs/hackathon/terms (Submission requirements)

> "Only if a run fails. Judges press Run on a free simulator, and whether you ran on hardware or a simulator is not scored."
> how-it-works#faq ("Do IonQ job limits affect how my project is judged?")

So the observable surface is **(a) the project page, (b) the code, (c) a run on a free simulator, (d) the 2–3 min video**. Anything a judge cannot reach from those four is not scored. A *failed run* is the one way the backend choice costs points.

## 5. Eligibility and submission requirements (verbatim list)

From https://qollab.xyz/programs/hackathon/terms § Submission requirements (fetched 2026-10-09):

- "Use the Qiskit framework"
- "Follow industry best practices on UI accessibility"
- "Run on Qollab's free simulators, including IonQ's quantum simulator. …"
- "Be published and runnable on Qollab.xyz on an MIT license before the submission deadline"
- "Use an MIT license for any outside repo the project relies on, such as a frontend or backend hosted elsewhere"
- "Have a project page on Qollab.xyz covering what the submission does, what problem it explores, how to run it, and other information to enable others to understand, replicate, or extend it"
- "Be built during the hackathon window. Existing code, templates and forks are fine as a starting point when disclosed, as Originality below explains; judging is based on what the team adds during the window."
- "Include a demo video of 2 to 3 minutes, at a public link that opens without signing in"

§ Participant obligations: "Release code and documentation under an MIT license · Make their projects available on Qollab for 12 months · Include the following attribution on their project: 'This effort is supported by Qollab & IonQ'".

§ Originality: "Projects must be substantially new work built during the hackathon window. Using AI, open-source libraries, prior tutorials, or Qollab-hosted templates as a starting point is fine and encouraged." Disqualification triggers include "Copying code, circuit designs, or written explanations from external sources … without disclosure and attribution" and "Using a Qollab-hosted template or open-source library as a starting point without disclosure". A disqualified slot is not backfilled by the runner-up.

how-it-works#faq on the video: "shows the project working. A screen recording with a voiceover is enough, and you do not have to appear on camera. Host it on YouTube, Loom, Vimeo or Google Drive so that anyone with the link can watch it without a password or sign-in." Also: "Submit what you have. Partial and rough projects are still eligible for judging."

Dates (terms): build window ends and submissions close **Oct 11 19:00 ET**; "Week of October 12th: local judging is complete"; "Week of October 19th: global judging is complete; global and local winners are announced". Teams: solo or up to 4; up to 5 projects per team.

**Accessibility is a requirement with no definition.** "Follow industry best practices on UI accessibility" is the entire text. Not found: a WCAG level, a checklist, or which trait it feeds. Assume WCAG 2.x AA as the industry reference and say so on the page.

## 6. Other trace of how the sponsors judge (context only, different event)

The search (2026-10-09) surfaced IonQ's note on the Qollab **Creative Challenge** (spring 2026): IonQ says it seeks "original, open-source quantum experiments that demonstrate the unique capabilities of quantum computing through creativity, storytelling, interactivity, and technical rigor". This is a *different program* and not a rubric for this hackathon. Source: https://ionq.com/news/ionq-partners-with-qollabs-creative-challenge-advancing-creative-quantum-innovation (known only from a search-result snippet; **page itself not fetched**). It suggests the same sponsors treat storytelling and interactivity as creativity and "technical rigor" as its own item. No weights.

## 7. Evidence descriptors for ECHO, per trait

Because the published rubric is four bare names, the descriptors below are **our reading**, derived from the sponsors' words in §§1–5 (the novelty bar, "essential, not randomness", "make … click", "read the description and the code, and press Run"), not from a published scale. Each is something a tester can observe in the page, the video, a run or the code. ★ marks a **blocking** descriptor (it can zero a trait or fail a requirement).

### 7.1 Novelty & Creativity (can be zeroed, §2)

| # | High score looks like | Low score looks like | Where the tester looks | Likely owning lane |
|---|---|---|---|---|
| N1 ★ | The page names the novelty-floor category in the terms' words ("An original analytical or educational contribution") and says in one sentence what is new: the player *acts first, then sees the rule*. | "A game about teleportation" with no claim; a judge cannot tell it from a tutorial. | First screen of the write-up | story-ui (copy) / platform (README) |
| N2 | The three rules (no-cloning, no-signalling, teleportation) are *causally linked in the world*: the failed copy in M1 is why the player needs M2/M3, and a result changes the scene (lights, door, link repaired). | Three separate quiz screens with the same UI; the world does not change. | Play M1→M3; video | gameplay |
| N3 | A third-person controller in a walkable scene is on screen within the first 30 s of the video and the first minute of a run. | Title card or text panels first; no movement for minutes; a static visual. | Run; video 0:00–0:30 | gameplay / art |
| N4 | Quantum feedback is *non-obvious to the player*: they fail a clone, get a numeric fidelity, and the failure *teaches the rule*. | "Wrong, try again", or a yes/no a judge can guess. | Play M1 | quantum / story-ui |
| N5 | The "Declassified" overlay links each in-game action to a reproducible circuit the judge can read. | Circuits appear only as decoration, or never. | Overlay; code | story-ui / quantum |

Theme fit: *Quantum Unlocked* ("make the hardest ideas … click", "quantum networking") matches no-signalling and teleportation directly. Playground's "essential, not randomness" test is also met for entanglement and measurement, so a second theme is arguable but unconfirmed (Q2).

### 7.2 Technical Execution (can be zeroed, §2)

| # | High score looks like | Low score looks like | Where the tester looks | Likely owning lane |
|---|---|---|---|---|
| T1 ★ | **Run on Qollab** → **Built-in simulator** → the game appears and is playable, no console error, no sign-in, in Chrome/Edge/Firefox 153+. | Run fails, hangs on "Compiling…", white screen, or needs a key. | A real signed-out Qollab run (only the owner can do this) | platform |
| T2 ★ | Puzzle numbers come from real local Qiskit (`Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity`) and a tester recomputes them independently (e.g. the optimal universal 1→2 cloner's single-copy fidelity of 5/6 is computed, not a dialogue constant). | Constants in JS, "random" outcomes, or Qiskit imported but unused. | `echo/quantum/`, `echo/tests/`; an independent calculation | quantum |
| T3 | Exactly one `backend.run` per run, it succeeds on built-in **and** on an IonQ simulator, and the page states what it was (Bell sampling, not "teleportation on IonQ"). | A second `backend.run` (stops the run), or a teleportation-on-IonQ claim when only Bell counts ran. | `git grep backend.run`; run console; page text | platform / quantum |
| T4 | The game finishes: title → three missions → credits, 3 consecutive times, ≥30 FPS on a mid-range laptop, no soft-lock. | Soft-lock after a failed test; the ending cannot be reached. | Blind-tester play-through | gameplay |
| T5 | Code a judge opens is readable: small named modules, tests, comments on scientific subtleties; ≤100 files, ≤2 MB each. | One huge file, dead code, no tests, a file over 2 MB. | Code tab | all |
| T6 | Accessibility is visible: subtitles, keyboard-only menus, visible focus, reduced-motion toggle, contrast. | Mouse-only menus, no captions for audio, colour-only signals. | Run; keyboard-only pass | story-ui |

### 7.3 Impact Potential (no published definition; has its own specialty award "Most Impact")

The Qollab pages define **Quantum Impact** only as the industry/hybrid theme ("measurable gains"). What the *trait* means for an education project is **not found**. The descriptors assume it means how much a real audience could gain.

| # | High score looks like | Low score looks like | Where | Owning lane |
|---|---|---|---|---|
| I1 | The page states the audience (non-physicists) and a **measurable learning outcome**: three explicit teach-back questions with the answers the game shows. | "Teaches quantum", no audience or outcome. | Page; end screen | story-ui |
| I2 | A first-time tester answers the three teach-back questions after play without a textbook (blind test, with a count). | A tester finishes but cannot say why cloning failed. | Blind test | red-team / story-ui |
| I3 | Easy reuse: the page has a "Make it yours" fork path and the quantum module runs standalone. | No reuse path; quantum code entangled with the renderer. | Page; code | platform |
| I4 | Low barrier: no sign-in, low-quality mode, ~10 min play length a judge will actually finish. | Needs a high-end GPU or very long play. | Run; page | gameplay / art |

### 7.4 Documentation Quality (own specialty award "Best Documentation")

The terms define the page's content, so this trait is the most checkable: "covering what the submission does, what problem it explores, how to run it, and other information to enable others to understand, replicate, or extend it."

| # | High score looks like | Low score looks like | Where | Owning lane |
|---|---|---|---|---|
| D1 ★ | The write-up covers each named thing: what it does, what problem it explores, **how to run it** (numbered steps: Run on Qollab → Select QPU → Built-in simulator → Run; supported browsers; expected output), how to extend it. | A story pitch with no run steps; steps that point to GitHub. | Project card as a signed-out visitor | platform (README) |
| D2 ★ | Attribution appears verbatim ("This effort is supported by Qollab & IonQ"); MIT `LICENSE` present; prior code, templates and assets disclosed with licences. | Missing line, no LICENSE, undisclosed assets (grounds for disqualification). | Card; `LICENSE`; asset credits | platform |
| D3 | The 2–3 min video is embedded at the top (per the earlier note YouTube is the only host the page can embed), shows the real Qollab page, a run and the quantum evidence, is 2:00–3:00 and opens signed out. | No video, wrong length, private link, or a trailer with no gameplay. | Page; video | platform |
| D4 | The page explains the science in a concept → circuit → effect table and states limits honestly (what was *not* run on IonQ). | Overclaims, or no limitations. | Page | quantum / platform |
| D5 | The **default** version's card renders signed out (headings, math, images, one paragraph per line). | "This project doesn't have a write-up yet" on the default version (seen on QCFlows). | Signed-out card after publish | platform (owner publishes) |

## 8. Contradictions and gaps between Qollab's pages and our docs

| # | Qollab says | Our doc says | Verdict |
|---|---|---|---|
| C1 | No weights published (§1). | [[Research/qollab-platform-and-submission]] §4: "Four traits, equally weighted". | **Unsourced in our earlier note.** Weights are unknown. Mark the earlier note's line stale (supervisor/owner; this lane does not rewrite it). |
| C2 | A "common rubric focused on" four traits, nothing more. | `ECHO_MASTER_VISION.md` §15 gives a Claim/Evidence table per trait as if it were the rubric. | §15 is **our guess**, not theirs. §7 above is the frame for red-team scoring. |
| C3 | "Quantum Impact" is the **industry hybrid** theme with "measurable gains" over a classical baseline. | §15 uses *Impact Potential* as education reach for non-technical audiences. | The trait is undefined and its name collides with a theme. Risk: a judge applying the theme's meaning scores ECHO low on Impact. Counter: state measurable learning outcomes (I1, I2). |
| C4 | IonQ result "neither add[s] nor subtract[s] points"; judges press Run on a free simulator. | `CLAUDE.md` and the NOW bar include "one honest selected-backend job". | Consistent as risk control (a *failed* IonQ run is the only penalty) but the IonQ job earns **no points**. Built-in simulator flawless comes first. |
| C5 | Select QPU labels the IonQ remote simulators "Credits apply" when signed out; docs say free (earlier note §2). | Our plan assumes the IonQ simulator path can be tested. | Unresolved; owner check signed in. |
| C6 | Accessibility: only "industry best practices on UI accessibility". | Vision lists subtitles, keyboard menus, contrast, reduced motion; `QOLLAB_DEPLOYMENT.md` warns `role="application"` can hurt assistive tech. | No conflict; ours is stricter than anything published. No WCAG level named, so we choose and state one (Q4). |
| C7 | Safari, iPhone and iPad cannot run projects. | Vision targets a "mid-range laptop" and lists no browsers. | The page and the video must state supported browsers. |
| C8 | Theme is declared at submission; "one or more" themes. | Vision does not name the theme ECHO declares. | A gap, not a contradiction (Q1, Q2). |
| C9 | Using a library or template without disclosure is a disqualifier. | `CLAUDE.md` asks for licences on third-party assets. | Consistent. Disclose Three.js, addons, Pyodide/Qiskit, fonts, audio and AI-tool use on the page. |

## 9. Cheapest gaps to close, ranked (for later scoring)

1. **D1/D2/N1**: page copy (run steps, attribution line, MIT, novelty claim). Copy only, no engineering; protects three traits including both zeroable ones. Platform lane writes the README; the owner publishes.
2. **T1**: a flawless signed-out run on the built-in simulator. The only item that can make a run *fail*. Needs the owner's Qollab run (`.claude/rules/qollab-runtime.md`); a local runner result is not evidence of it.
3. **T2**: independent recomputation of the quantum numbers (the red-team can verify this alone).
4. **I1/I2**: teach-back questions on the end screen and a blind-test count.
5. **D3**: video length and embed.

## Open questions (carried to the report)

Q1 theme(s) to declare; Q2 may a submission declare two themes; Q3 the signed-in submission form's fields (carried from the earlier note); Q4 which accessibility level to claim.

## Related

- [[Research/qollab-platform-and-submission]]
- `.claude/rules/qollab-runtime.md`
