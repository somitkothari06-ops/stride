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
