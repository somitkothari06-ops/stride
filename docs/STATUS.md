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

## Supabase connection checkpoint, October 26, 2026

- Official Homebrew Supabase CLI 2.122.0 installed and authenticated through the user's browser approval. Existing healthy Stride project in Mumbai linked; no replacement project or paid upgrade created.
- Public URL and publishable/anon client key saved in ignored local and Devlab environment files with mode 600. Auth settings returned HTTP 200 with email authentication enabled. No service-role key was used.
- CLI configuration initialized in `supabase/`; local link metadata stays ignored. This is connection setup only: app login, account ownership, guest claiming, logout and cross-device access are not implemented yet. No remote schema migration was applied.
- OpenCode reviewed a source-only copy. The proposed next milestone keeps SQLite workspaces and adds validated Supabase identity, an atomic guest claim and two-user isolation tests. This recommendation still requires implementation and verification.

## Account identity and landing pass, October 26, 2026

- Optional email/password Supabase login and email-confirmation signup UI added at `/login`; guest mode stays available. Existing guest work is claimed only on an account's first workspace creation. Existing account work is never merged or overwritten by a different guest.
- Account access uses server-owned, revocable opaque device cookies. Supabase user identity is checked server-side; provider access/refresh credentials stay in private SQLite, not browser JavaScript or API responses. Guest claim rotates the storage identity so in-flight guest writes cannot target the claimed record. Usage allowance follows the claim.
- Production checks and 42 tests passed, including guest claim, isolation, revoked/expired sessions and refresh-after-logout refusal. A live synthetic check passed two-device reads/writes, two-user isolation, old-guest refusal, concurrent provider refresh, same-origin enforcement and immediate logout/replay refusal. Temporary test users and owned local test workspaces were removed. These are synthetic tests, not a security audit.
- Supabase confirmation redirects now target the local preview login page; confirmation remains required. A custom email sender is not configured. Public signup delivery, password recovery and a stable public HTTPS origin remain incomplete. Live account tests used temporary administrator-confirmed synthetic users; they did not verify real confirmation email delivery.
- Landing study-loop cards now use distinct white/cobalt/yellow surfaces and shorter text. The course section shows an illustrative source-to-practice example. A compact context-control line and expandable limitations replace the large prose block. OpenCode reviewed source-only security and copy changes; its concurrency concern and duplicate-example suggestion were addressed. One claimed workspace-expiry bug was not reproducible because workspace records have no expiry timer.

## Social sign-in checkpoint, October 26, 2026

- Added Google/GitHub controls, an expandable email fallback and a server-side S256 PKCE return flow. Readiness is read from Supabase; a disabled provider stays visibly unavailable. GitHub credentials were supplied privately and enabled through the official CLI; Google remains unconfigured.
- Added browser/origin binding, a ten-minute one-time attempt, callback replay refusal, cancellation during an in-flight exchange, verified Supabase identity and shared account-claim handling. Fixed Next.js internal-listen-address redirects by choosing only explicit allowed origins; added public HTTPS origin pinning.
- All 48 tests and production build passed. Readiness/failure HTTP smoke passed; GitHub authorize returned HTTP 302 to github.com. This does not establish that a real person's provider consent and successful callback completed. Google consent cannot be tested until its credentials are configured.
- OpenCode GLM reviewed source-only flow/origin code at low effort after a high-effort run stalled; it found no concrete issue in that bounded pass. Manual review and tests still determine acceptance. PKCE storage-encoding and internal-origin failures were caught and fixed by tests.
- Provider app secrets stay in the ignored local `.env.oauth.local` and Supabase provider configuration. They are not copied into the app runtime or committed. See OAUTH-SETUP.md for remaining Google setup and end-to-end checks.

## Navigation and Pip capture, October 26, 2026

- The reported logout was public-page navigation: the workspace breadcrumb and account/setup brand links led to `/`, whose header always said Sign in. Workspace links now stay in the app; the public header checks account status and shows My account/Back to my workspace without a false signed-out label. Profile names are not silently replaced by provider identity. The user's screenshot and a server account/device record establish that GitHub's real return flow completed.
- Added Pip, a code-native floating mascot on landing/workspace, with browser dictation and typed capture. It proposes coursework, personal context and thoughts, then requires an editable selected-item review before filing. No continuous listening, OS automation or new speech backend is claimed.
- Added expiring workspace/revision-bound reviews, source-quote checks, atomic batch save, duplicate-submit protection, append-only personal context and a conservative full-original-thought fallback. Replaced duplicate landing/workspace voice entry points with Pip invitations; structured About You dictation remains on its own page.
- The first live run rejected a model evidence-type mismatch and safely used the thought fallback. An explicit JSON/string contract corrected it; the subsequent live synthetic run separated all three destinations and preserved the stated exam date. HTTP checks passed persistence, scoped save, origin refusal and idempotence. All 56 tests, TypeScript and the production build passed. Browser review checked the mascot, editable destinations, explicit dates and compact proposal cards; synthetic UI captures were not committed into the existing browser workspace.
- OpenCode supplied edge cases and a bounded source review. Its alleged rollback bug assumed a cached mutable state object, but getState parses a fresh database row and the rollback/retry tests passed. Its alleged thought replay used distinct review IDs, which are separate intentional captures; same-review replay is explicitly tested.
- See COMPANION.md for behavior/limits and ROADMAP.md for remaining public hosting, account setup/recovery, scheduling, student trials and submission work.

### Pip and visual refinement — 26 October
Pip now has a rounded head, happy expression, gentle idle motion and local pointer-following pupils, with reduced-motion support. Removed the launcher subtitle, example prompts and repeated capture/privacy copy from the panel; voice/service information stays in Connections. Bright blue foreground text was replaced across active application styles with navy or neutral ink while preserving cobalt graphic surfaces. Navigation now uses navy/yellow active states, task badges are larger, the profile is a labelled raised button, and Memory uses a navy context panel and yellow work heading. Desktop browser checks confirmed the simplified panel, typed-input enablement, pointer-driven pupils, Memory layout and absence of removed copy; compact checks prompted lifting Pip above bottom navigation. No synthetic captures were saved into the existing browser workspace.
Final verification: all 56 tests and the production build passed on the Devlab. The running preview returned health 200. Browser checks confirmed navy focus outlines, no compact horizontal overflow, Pip above mobile tabs, and profile access in the mobile menu. Final preview: `outputs/stride-pip-refined.png` outside the repository. Removed the two synthetic HTTP-test guest workspaces and matching remaining review drafts; provider usage counters were retained. Existing student workspaces were not cleared.
