# First development milestone

Implemented: assignment intake/confirmation, Today planning, authored guided practice, attempt records, source-aware memory controls, live-provider adapters, role-source interface and browser-session persistence.

Validation on the Nebius Devlab:

- TypeScript check.
- Sixteen planner/storage/provider-configuration/connection-status tests covering ambiguous/invalid dates, urgent replanning, time bounds, no-history/no-goal flow, calendar timezone, independent sessions, transaction rollback and call allowance.
- Production build.
- HTTP smoke flow for persistence, separate sessions, preparation/attempts, dependent-record removal and cross-origin rejection.
- Browser check: prepared a SQL session, saved a synthetic explanation as self-report, confirmed an urgent exam notice, refreshed the stale plan, and verified the recommendation switched to exam revision.

Live integration update, October 25, 2026:

- A dedicated Token Factory key was configured privately on the Devlab. No credential is stored in this repository.
- The account-visible `nvidia/Nemotron-3_5-Lightning` model passed a small structured-output connection test.
- Reasoning was explicitly disabled for short structured tasks after an initial output-limit failure.
- Planner prompts were made explicit about JSON field types after validation caught a string where an array was expected. Invalid output was rejected rather than saved.
- Live synthetic workflow passed: extraction (495 ms), source-linked planning (538 ms), practice preparation (872 ms), and labeled model assessment (451 ms). These are single-run observations, not latency guarantees or benchmarks.
- Tavily is not configured. No live role-search quality is claimed.

These checks do not establish model correctness across coursework, educational efficacy, production authentication or a public submission deployment. All test coursework is synthetic.

Connection status fix:

- Replaced the hardcoded “still needs verification” sentence with persisted successful-response metadata.
- Verification resets when the key, model, endpoint or reasoning configuration changes; a later failure does not erase the last-success timestamp.
- The student settings view now explains service availability without exposing environment-variable instructions.
- See [the completion checklist](ROADMAP.md) for the unfinished project scope.

Recovery checkpoint, October 25, 2026:

- Added consistent live SQLite snapshots and integrity verification, with a restore command that requires a new directory.
- Eighteen tests and TypeScript checks passed on the Devlab's Node 22 runtime, including committed WAL capture, independent snapshot restoration and rejection of corrupt sources/overwrite attempts.
- A private snapshot of the live Devlab database completed and passed integrity verification without changing the live database. It remains on the same volume; no off-volume recovery claim is made.
- The helper evaluation and reasoning-setting details are in [DEVELOPMENT-HELPERS.md](DEVELOPMENT-HELPERS.md). Four headless free-model review tasks completed; suggestions were reviewed, and the missing directory fsync they identified was fixed.
- Scheduled off-volume backup and disaster recovery remain incomplete; see [RECOVERY.md](RECOVERY.md).

Signal and course-context checkpoint, October 25, 2026:

- Built five independent visual studies. The user selected Signal; the working app now uses the blue/yellow direction, clearer copy and larger text. Landing page `/`, About You `/about-you` and study app `/workspace` are separate routes.
- Added an optional-story setup/review flow for background, experience, interests, uncertainty, ambitions, constraints and learning preferences. A blank career goal is valid. Bounded student-provided context is supplied to planning and preparation.
- Added review-before-save imports for text PDF, PPTX, DOCX, TXT and MD. Imported text is bound to the current browser/session review, expires after 15 minutes or restart, and cannot be substituted during confirmation. Source text, not original files, is persisted after confirmation.
- Practice can reference bounded matching-subject course excerpts. Public-course comparison uses selected passage IDs and server-attached quotations; model interpretation remains feedback, not certified semantic support.
- Twenty-nine tests and the production build passed on Node 22. A synthetic HTTP profile check passed persistence, optional goals, session separation and clearing context. A live synthetic course check passed extraction, confirmation, tamper/foreign-session refusal, idempotent confirmation, cross-origin refusal, source-linked practice, quoted comparison and deletion invalidation.
- Parser tests cover PDF text/page locators, reordered PowerPoint relationships, Word text sections and rejection of unreadable/oversized input. They do not establish OCR or broad document-layout fidelity.
- The dependency audit reported zero known vulnerabilities after moving validation to Zod 4.6.7; compatibility checks passed. This is a point-in-time audit, not a security guarantee.
- See [course details](COURSE-CONTEXT.md), [About You](ABOUT-YOU.md), [design studies](DESIGN-DIRECTIONS.md) and [workflow references](WORKFLOW-REFERENCES.md). Production identity, daily scheduling, Tavily, OCR and public judge access are still unfinished.

Card contrast and typography refinement:

- Replaced the external font import with a locally served variable Plus Jakarta Sans font; its OFL notice is included under `public/fonts/`.
- Kept the blue focus surface and gave deadlines a white surface with a strong border, Memory a navy surface and Direction a yellow surface. Increased heading/body weight and size, shortened dashboard copy and converted key card links into visible buttons.
- Kept full observation feedback in Memory while making the dashboard summary compact. Planning reasons are available in a disclosure; stale plans have one refresh action rather than duplicate replan controls.
- Twenty-nine tests and production build passed. The deployed page and font returned HTTP 200. Browser inspection confirmed the new surfaces, labels and the working Memory button.

Voice capture and compact masthead (October 25):

- Smaller segmented navigation and daily heading, compact demo notice and readable summary chips.
- Landing-page introduction capture transfers an editable draft into personal setup; profile saving remains explicit. Dictation is also available on story/context fields.
- Workspace speak-or-type panel separates coursework, personal introductions and thoughts. Coursework uses existing extraction/confirmation; thoughts persist separately, can be removed and are included in workspace exports/reset. They are not treated as learning evidence or deadlines automatically.
- Uses browser SpeechRecognition/webkitSpeechRecognition with English (India), explicit start/stop, a two-minute cap, partial-result review, permission/network errors and typed fallback. Browser services may process audio; Stride does not retain audio. Unsupported browsers still accept typed/device-dictated input. Live human audio accuracy is not yet verified.
- OpenCode free DeepSeek high reviewed the source-only dictation component. Stale recognizer callbacks, partial-result handling and character-limit disclosure were addressed. No private data or keys supplied.
- Devlab TypeScript, 29 existing tests and production build passed. Synthetic capture HTTP check passed persistence, isolation, bounds, separate note semantics, deletion and reset.

Raised buttons and warm background (October 25):

- Applied the reference button's bold type, rounded corners, solid lower edge and press feedback across main actions. Yellow primary actions and navy secondary actions retain their roles; quiet text/navigation controls stay compact.
- Replaced the cool flat canvas with warm off-white and a faint 24px dot grid across landing, setup and workspace; reading cards remain solid surfaces.
- Task and attempt summaries now link to My work and Memory; the time summary still opens study preferences.
- OpenCode GLM free high reviewed the source-only CSS. Its two suggestions were not applied: global disabled opacity already exists, and the dictation control already carries the shared btn class.
- Twenty-nine tests, TypeScript and production build passed on the Devlab.

Compact Today introduction (October 25): replaced the oversized slogan and uppercase overline with a short 32px heading (28px on mobile), sentence-case label, one-line supporting copy and a cobalt rule. Browser screenshot verified hierarchy against the blue focus card. OpenCode reviewed the source-only diff with no established defect. All 29 tests, TypeScript and production build passed on the Devlab.

Today welcome replacement (October 25): removed the rejected slogan, accent rule and hidden duplicate time button. Today now has a compact personal greeting and date in an open horizontal row, stacked on mobile. The separate date/privacy row remains on other views. All 29 tests, TypeScript and build passed; browser screenshot verified the deployed layout.

Direction visual refinement (October 25): shortened the oversized page heading, replaced the pale connection empty state with a compact navy setup card and raised yellow action, and restyled the role form with clear labels and unavailable-search text. Search remains gated on Tavily and now also rejects queries shorter than three trimmed characters. Connected search uses full width; disconnected setup uses two columns on large screens and stacks on smaller screens. OpenCode caught the initial connected-state empty-column issue, which was fixed; its preference for a full-width button was not required by the chosen layout. All 29 tests, TypeScript and build passed. Browser inspection confirmed the unavailable state and working setup button.

Shared visual polish pass (October 25):

- Rebuilt the shared voice capture as a navy introduction plus white editor, side by side on larger screens and stacked below 1000px. Shortened instructions, compacted language/status controls, added an accessible privacy disclosure and kept editable transcripts, counts, review/save and typed fallback.
- Disabled unsupported-browser speech controls have an explicit label and typed fallback. Speech does not start on load. This pass did not establish real microphone accuracy.
- Standardised rounded raised buttons across landing/setup/workspace; corrected the primary hover cascade, subtle-button green hover, focus rings, active navigation count contrast and icon hovers. Focus retains a visible cobalt ring; disabled states remain distinct.
- Shortened My work and Memory headings, unified remaining course/practice/memory/settings colours, and moved secondary upload/comparison explanations into disclosures while keeping scan/diagram limits visible.
- OpenCode reviewed the source-only old-style audit and final diff. Its concrete cascade/selector findings were checked against the source before changes; no keys or private student records supplied.
- Final Devlab TypeScript, 29 tests and production build passed. Browser inspection covered landing voice input, desktop and narrow layout, personal story fields, My work, Memory, connection dialog and course library. No profile or coursework was changed by these visual checks. Narrow rendered content width matched its viewport (no horizontal overflow at that checked size); this is not a complete accessibility/device audit.

Final voice review restored a persistently mounted speech-status live region for assistive technology and made the possible browser-provider audio transmission explicit in the visible disclosure label. The add-work dialog was also visually checked; no extraction call or data save was made.

Lower-friction onboarding and preparation reliability (October 25):

- One shared voice/privacy disclosure per personal-setup page replaces the repeated line below every question; per-field language metadata is removed. Questions are now 23px bold on desktop, 21px on mobile, with short hints and smaller optional counts.
- Recording gates other microphones and Back/Continue so navigation does not discard the last spoken chunk. A landing introduction no longer skips required name entry for a new student; server validation is retained.
- OpenCode GLM reviewed the onboarding guards with no established defect. Browser inspection confirmed the larger questions and exactly one privacy notice; no personal answers were changed.
- A synthetic live check initially failed because preparation returned an invalid course reference with zero uploaded excerpts. The server rejected it. Preparation context now exposes only the course excerpt ID namespace, excludes unrelated work/observation/material IDs, and explicitly requires an empty source list when no excerpts exist. Unknown IDs remain rejected.
- Added two context-boundary regression tests. All 31 tests, TypeScript and production build passed. Profile and thought HTTP checks passed. After the fix, the full live extraction/planning/preparation/assessment flow and live source-linked course comparison passed; course intake checks covered confirmation, ownership/origin checks and invalidation.
- These synthetic checks do not establish general model accuracy or human microphone performance. Account provisioning, Tavily live verification, public judge access and scheduled briefs remain open.

Tavily connection and runtime reliability (October 25):

- The user-supplied Tavily key was read from the ignored local mode-600 environment file and transferred through SSH stdin to the private Devlab environment; no key was printed or committed and the Nebius configuration was preserved.
- First full search check reached retrieval but failed in model comparison. Retrieved sources are now preserved as source-only results when model output has invalid evidence IDs, the model is unavailable or its allowance is reached. Unexpected errors still propagate; foreign/removed observation IDs remain disallowed.
- The live check passed with five sources including Google, IBM and Atlassian internship hubs. Source URLs, retrieval times, independent-session persistence and no invented observed evidence were checked. That run used guided/source-only mode, so live AI comparison is not claimed for it. Not every result was an open internship posting; source relevance/eligibility/freshness remain review tasks.
- Added private readiness endpoint, Linux runtime lifecycle script and host systemd service with bounded restart attempts, pre-start orphan cleanup and PID/start-time/boot/cwd identity checks. No additional public port or paid infrastructure was provisioned.
- A consistent private SQLite snapshot passed integrity verification before supervision was enabled. Synthetic recovery drills killed the app and its Docker-exec supervisor client separately; both restarted with a new Node PID and preserved saved workspace content. The test marker was removed.
- OpenCode reviewed source-only lifecycle/fallback code; PID-reuse and orphan-client concerns were addressed. Unknown unmanaged port conflicts are left for investigation rather than killing arbitrary processes. Invalid PID records are quarantined safely.
- All 38 tests, TypeScript and production build passed. See DEPLOYMENT.md for restart, rollback and explicit smoke checks. Human audio trials, Supabase, scheduled briefs and public judge access are still pending.
