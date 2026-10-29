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

### Concise role exploration — 27 October
Reworked Direction with a split navy/white role picker, editable starter roles, a clearer neutral disabled state and a shorter heading. Starter buttons only fill the input and focus it; search remains explicit. Tavily results now lead with a compact NVIDIA/Nebius brief: a short role explanation, coursework connection, up to three requirements and one optional exploration activity. Original excerpts are collapsed in source rows. New requirements include exact excerpt quotes and source numbers; invalid quotes or observation IDs fall back to unassessed sources. Quotes verify provenance, not complete semantic support or whether a posting remains open. Existing saved comparisons still render without migration; a new search produces the richer brief. OpenCode reviewed the interaction plan using no private data. All 58 tests and the production build passed on the Devlab, including rejection of invented quotes, invalid source references and requirement labels absent from their cited quote. A first live review exposed a genuine-but-unrelated quote; the new lexical guard rejects that case.
The richer live task initially hit the old 1,800-token output limit. Direction alone now requests up to 3,200 completion tokens, within a server-side 4,000 cap; visible fields retain short length limits. Other model tasks keep their existing default. The response still fails safely if truncated or unsupported.
Final live browser search completed with a short AI role explanation, a conditional coursework connection, an exact source-backed requirement and a concrete API exercise. The previous failed/truncated response preserved all five retrieved sources. Browser checks verified starter-role selection, focus transfer, disabled/enabled search states, expandable quote support and compact layout without horizontal overflow. The updated Direction page was left open for the user; screenshots are outside Git in the project outputs folder. Final suite: 58 passing tests and successful production build. This live check updates only the existing workspace’s replaceable role-exploration result; coursework and observations are unchanged.

## Conversational Pip and copy pass, October 27, 2026

- Pip now opens in a full `/pip` workspace with navigation, a wide conversation area, rounded composer, microphone/send controls and an internal conversation menu. Coursework, role exercises and public-course choices open it with a short automatically submitted request. One-time handoff IDs prevent completed requests from repeating on reload. Commands use high-contrast code blocks with Copy code; safe markdown supports tables, bold and inline code.
- Conversation uses server-owned history and bounded workspace context. Helpful public questions can retrieve Tavily sources automatically; personal talk does not require search. Tasks, thoughts and profile changes still require explicit reviewed capture. Atomic chat versions, idempotent turn IDs, paired retention and clear tombstones guard retries and concurrent tabs.
- Replaced the confusing public-course reference dropdown and disclaimer wall with named subject/course cards, short topic descriptions and official course links. With no uploaded notes, Explore with Pip starts learning; with notes, the existing comparison can suggest one exercise. Removed repeated AI status tags, raw search excerpts and redundant instructional text across the affected pages.
- Four bounded free OpenCode reviews covered copy, layout and failure cases using source-only inputs. Suggestions were checked before adoption; inaccurate claims were discarded. Final Devlab checks: 67 tests passed, TypeScript passed and production build succeeded. Live synthetic checks passed follow-up teaching, real Tavily retrieval, replay, persistence, clearing and no implicit profile/task changes; the three synthetic workspaces were removed while usage counters were retained.
- Browser checks verified course-to-chat automatic handoff, the completed lesson reply, readable commands, full chat navigation and a compact 400 CSS-pixel layout without horizontal overflow. Screenshots are in the project outputs folder outside Git. Browser dictation still needs a human microphone test; stronger open-source speech recognition is researched in SPEECH-OPTIONS.md but not installed. Model teaching quality still needs real student trials.
- Remaining work includes Google provider configuration, stable public HTTPS hosting, public email/recovery setup, student trials and the submission package.

## Practice studio and coursework header, October 27, 2026

- Rebuilt prepared sessions as a navy lesson cover, readable explanation, numbered checkable step cards and a yellow answer panel. Existing educational content, source inspection, checkboxes and attempt saving are preserved. The empty session state now previews the explanation → steps → question structure.
- Replaced the oversized course-library button/instruction line with an independent document card alongside actual open-task and subject counts. Add work remains in the persistent top bar.
- A bounded source-only OpenCode review informed title hierarchy, progress and question sizing. Its native-checkbox styling claim did not match the existing hidden-checkbox implementation and was not applied. Both final application checks and production build passed (67 tests). Browser checks verified live preparation, checkbox/progress changes, answer-button gating, the library card and a compact 400 CSS-pixel layout without horizontal overflow. Compact body/step text is 17px and the question is 22px. Test answer text and checked steps were cleared without saving an attempt. Screenshots are outside Git in outputs.

## Wordmark and profile shortcut, October 27, 2026

- Removed the three-bar mark from the workspace header and loading state; the workspace wordmark is larger. The profile shortcut now uses a light raised card, the student's name and a yellow initial badge, with a navigation arrow instead of an ellipsis. Long names remain truncated visually but the full name is included in the accessible button label.
- Used a bounded free OpenCode visual review; kept the existing profile navigation rather than adding its suggested menu. All 67 tests and production build passed.

## Quick chat and latest-message regression, October 27, 2026

- Restored quick chat when clicking the mascot or the general invitation. Expand opens the full workspace; unsent text moves as an editable draft, without automatic submission. Learning buttons still open the large workspace directly. Both views load the same server conversation. Minimizing preserves the in-page draft. Expansion is restricted to the chat pane, and blocked draft storage stops navigation rather than dropping the words.
- The reported repeated greeting exposed weak turn separation: previous replies and the latest message were embedded in one JSON user block. Conversation now uses native ordered user/assistant turns followed by the current request. Direct model-identity questions return the actual configured model; other identity wording receives that same trusted configuration in model context. Existing historical replies are preserved.
- Live regression checks passed greeting → configured-model question → foreign-key topic change, alongside teaching correction, retry/reload, clear and real web retrieval. The synthetic workspace was removed with usage counters retained. Browser checks verified quick-panel opening without navigation, minimize/reopen draft preservation, editable expansion and profile navigation. Added tests cover turn ordering, grounded model identity, draft-only expansion and blocked storage.
- The original two-builder handout assigns main app/integration to one builder and bounded AI/search modules or independent validation to the other. This repository now implements much of both software scopes, but it is not evidence that the friend's independent testing or submission work is finished. Public HTTPS access, Google/email recovery setup, real student/model/voice trials and the final submission package remain incomplete.

Final checkpoint: 71 tests and production build passed. A browser request using the reported wording “what model are you man” returned the configured NVIDIA Nemotron model instead of another greeting. Old incorrect replies remain in conversation history; they are not silently rewritten.


## Named conversations, public access and account onboarding, October 27, 2026

- Pip now has separate chats, a searchable history sidebar, automatic topic titles, manual rename and confirmed deletion. Quick chat and full chat preserve the selected thread; lesson handoffs create their own conversation. Legacy history migrates atomically and saved messages are retained up to explicit demo limits (50 chats, 100 exchanges each). Model history remains bounded independently; long-term retrieval/summarisation is still unfinished.
- Normal workspace responses exclude chat transcripts; the selected-chat endpoint loads its messages, while explicit data export retains the complete saved history. Tests cover ownership isolation, retries, concurrent revisions, migration, late responses after deletion and manual-title protection. Live teaching/correction, topic changes and source retrieval passed; the generated SQL-join topic title was verified. The browser also verified a relevant title for the migrated backend-API conversation.
- Public HTTPS preview is live at https://stride-213-239-171-145.sslip.io with Caddy, valid TLS, secure HttpOnly cookies, pinned auth redirects and cross-origin refusal. Google and GitHub start flows are enabled. The user completed real Google login in Safari. This exposed inherited Alex demo identity; unconfirmed account profiles now route to About You, with a basic-details shortcut and preservation of work/chats. No provider name silently overwrites student input.
- A sign-in allowance test exposed milliseconds divided as seconds. The window now correctly spans 15 minutes; deterministic checks cover case-insensitive email limits and expiry.
- A consistent off-volume AES-256-GCM encrypted database snapshot was decrypted and passed database integrity verification. Private keys, snapshots and provider credentials remain outside Git. Recurring backups are not scheduled yet.
- Free OpenCode reviews covered thread concurrency, regression cases and encrypted-backup handling. A further onboarding review stalled after reading its source-only copy and was stopped; its unfinished output was not used. Suggestions were checked against source/tests; this is not a security audit. Final validation evidence is recorded below after the build and public checks.

Remaining release work: independent student testing (including Google audience availability), real microphone trials, email recovery/delivery, long-memory retrieval quality, scheduled backups and submission assets. Optional Gmail/Drive, daily preparation, OCR and executed code checks are not implemented.

Validation: all 82 automated tests and production build passed. Public HTTPS and thread API checks passed with zero inference calls; default workspace/export transcript separation was verified. Browser checks confirmed the basic-details save, manual rename, new-chat switching with draft restoration and the mobile history drawer at 300 CSS pixels without horizontal overflow. Four tracked synthetic test workspaces were removed; usage counters were retained. A separate public demo-browser workspace remains for visual review.

## Security controls, conversational setup and palette previews

- Sign out is now directly available on signed-in workspace, Pip and About You screens. Origin checks cover every shared mutation route; guest sessions have server-side inactivity expiry and logout revocation. Continue as guest preserves a guest intentionally through a separate action. Account-owned work survives logout. See SECURITY-REVIEW.md for evidence and unresolved host hardening.
- Personal setup now asks basic details, accepts one voice/text introduction, then shows editable review cards. Five separate narrative sections are no longer required. NVIDIA organises exact supplied quotes into existing profile fields; invalid evidence/full-field output falls back to the original introduction. No generated career direction is stored. A live synthetic introduction correctly grouped project experience, robotics interest, commute and learning preference without inventing an ambition; nothing from that trial was saved.
- A separate coordinated palette preview demonstrates the focus card, navigation and supporting study card together. Greens, softer alternatives and light/dark greys are samples only. The live app's cobalt palette is awaiting the user's choice.
- Final application checks: 88 tests and production build passed. Production dependency audit reported no known advisories. Public security and OAuth smoke checks passed. This is not a full security certification; the managed editor's HTTP ingress and other residual work are documented.


## Whole-theme background studio

The separate colour preview now changes the full canvas, navigation, focus/supporting cards, text and buttons across five palettes: Pearl & ink, Lilac dusk, Apricot studio, Midnight mint and Lemon slate. It does not change the application theme. Main text/secondary text on their actual page, card and hero surfaces plus CTA text all measured at least 4.5:1 contrast. A free OpenCode review correctly noted that Midnight's outer Add work button needed stronger separation; it now uses the mint hero pairing. Its unmeasured weak-text concerns did not match the computed ratios. All 88 app tests and production build passed; browser checks cover palette switching and mobile overflow.

## Personalisation, logout and document study — October 27

- Added Settings with 21 searchable light/dark themes, live preview, explicit save/cancel, text size, dotted background, reduced motion, study time and timezone. Appearance persists per workspace; browser cache stores appearance only. Stale saves are rejected. Preview dashboard links do not save another theme.
- Simplified the workspace header and grouped account, logout, privacy and export controls in Settings. Unsigned access opens a separate empty guest workspace. A revoked account cookie is refused on five private routes; logging out preserves the account's stored work.
- Theme cards now own their foreground/background pairs, fixing the invisible Direction card and poor Memory contrast in grey themes. Palette tests require readable foreground contrast. Runtime browser checks cover the rendered cards, not just swatches.
- PDF intake now retains every supported page and coverage metadata. The user's 191-page PDF was imported into the sole existing owned workspace: 191 pages processed, 71,396 text characters, no low-text pages. The assistant did not open or read its content. Its matching original PDF was retained privately for visual reading.
- Added a dedicated document study room with page-range selection, explanation, worked example, misconception, reasoning question, feedback and explicit saving. Optional selected-page images use the account-available `nvidia/Nemotron-3.5-Super-VL` model; text tasks retain Lightning. See DOCUMENT-STUDY.md for limits.
- Devlab TypeScript, 96 tests and production build passed. Live synthetic checks passed for logout revocation/account separation, ten mutation routes' origin protection, document teaching/feedback/cache retries/cross-workspace refusal, and PDF image labels/arrow direction. No actual student document was sent to development helpers.
- OpenCode reviewed source-only Settings/auth changes. Its established stale-response and logout/bootstrap findings were fixed. A second source-only document review identified a render-output buffer mismatch and active-session eviction. Both were fixed; rendering also leaves headroom for the model call and creates retained files privately from the outset.

Remaining: scheduled full-data backups and upload-orphan retention, the documented externally reachable development-editor ingress, production-scale abuse controls, real speech testing and final hackathon submission/demo work. These changes do not establish a complete production security audit or perfect teaching/vision accuracy.

## Button choices, daily preparation and release audit — October 28

- Added four theme-coordinated primary-button styles: theme accent, bold, soft and focus. Trusted palette pairs are previewed, saved per workspace and restored on reload; all 84 theme/style text pairs meet the contrast threshold in tests.
- Reworked the landing page around three interactive examples (notes, a deadline, a thought), direct course-library entry, clearer typography and fewer competing actions. Examples are identified as examples and make no fabricated calls/results.
- Added opt-in, account-only daily preparation in the student's timezone. Persistent jobs use leases, bounded retries and daily uniqueness; changed coursework or withdrawn consent prevents publication. The worker runs without a browser. A synthetic live run and its duplicate passed.
- Full encrypted backups now include a consistent SQLite snapshot and every referenced original PDF. Restore verifies bytes, rejects missing/symlinked originals, refuses an existing destination, revokes restored device/OAuth/review sessions and disables restored daily consent. An actual encrypted copy was restored on the developer laptop without displaying document contents. An 8 MiB synthetic original exposed a large-base64 validation bug; this was fixed and made a regression case.
- Hourly server backup and five-minute opted-in daily-plan timers are active. An hourly Mac pull copies encrypted archives while the laptop is running and connected; its encryption key is private and stored separately. Server container retains 48 successful hourly archives; off-host copies require their own retention management.
- Direct external editor port 8080 is refused on the public network interface for IPv4/IPv6, with persistent Docker-aware rules and a removal command. Private loopback editor access returned HTTP 200; app HTTPS and SSH remained reachable. This does not independently verify every Nebius console/tunnel path.
- Upload parsing is limited to two concurrent requests per app process and six previews per workspace per ten minutes. Abandoned original previews older than 24 hours are cleaned only when absent from every current workspace; malformed state fails closed.
- The reported Saturday error came from missing Add Work calendar context and accepting an unsupported model date. Clear relative dates now use a shared calendar resolver; copied messages need their original date. An invented model date cannot override the supplied words. Live October 28 checks returned October 31 for this Saturday and confirmed/saved both current and copied source types.
- OpenCode built the button picker and full backup tools in separate source-only copies. Kiro Crew provided an operations review but its configured backend used Codex, so further heavy work stayed on explicitly free OpenCode models. Three further source audits cover AI, workflows and operations; findings are reproduced before accepting them.
- The workflow audit found the new source-type enum omission and draft losses. The default source type now saves; Add Work drafts and course-upload reviews survive closing their panels, and per-work attempt drafts survive row changes. Re-preparing asks before replacing an unsaved answer and clears it only after success. Account reset preserves profile and uses a monotonic revision.
- Current checkpoint: 112 automated tests and production build passed. Nine synthetic public workflow checks passed after updating stale test fixtures for empty fresh workspaces. The date check includes actual save, not extraction alone. Wider AI/UX evaluation is ongoing; no zero-defect or perfect-accuracy claim is made.

### Settings and connection follow-up

The release now passes TypeScript plus 123 automated tests. Preferences save with a field-level three-way merge: unrelated coursework changes no longer cause a conflict; same-field conflicts retain the local choices when loading the latest snapshot for review. Replay-safe saves retry one transport failure. Plan failures can recover a newly stored plan with a read, without blindly generating twice. Builds now use inactive release directories. The first repeated public workflow run caught a Pip topic-change regression after asking model identity; latest-message framing was strengthened and the exact sequence is being retested. Safari transport failure remains under investigation, with credential-free proxy timing/status logs; it is not represented as a confirmed model failure.

Final targeted Pip retest passed after latest-message framing changed: teaching follow-up, model identity, new technical topic, actual web search and duplicate-safe persistence. Calendar save and all button-style preference save/reload checks also passed. Public deployment is active and the milestone is pushed to main.

### Any-subject course exploration

The course comparison's subject control is now editable, with suggestions from uploaded documents and coursework. Upload and comparison subjects are separate, so a stale database-course choice cannot silently override OS. The three starter references appear only for relevant subjects. An explicit Find courses action uses Tavily to retrieve educational-domain pages for other subjects, with no fake catalog or invented links. Search excerpts are signed to the requesting workspace, subject, exact source content and 15-minute expiry before the comparison API accepts them. A synthetic Computer networks upload successfully compared against a newly retrieved Cambridge course source; cross-workspace, subject substitution and tampered excerpts were rejected. OpenCode reviewed the flow; malformed results are skipped and automatic subject changes clear stale choices. Multi-process proof sharing is not claimed; the current deployment uses one app process.

Verification: TypeScript, 125 automated tests and inactive production build passed. Browser checks confirmed that OS shows its matching starter, another subject clears it, live Computer networks search returns a Cambridge course page, and Add notes fills the upload subject without saving a file. The live discovery/comparison check rejected cross-workspace, mismatched-subject and modified-source requests.

## Work Journal — October 28 reviewed release

OpenCode's draft was independently reviewed, repaired and deployed. The new Journal connects a resumable focus session, reviewed work logs (text/code, TXT/MD and PNG/JPEG/WebP) and a saved next step. NVIDIA Lightning and Super VL analyse the submission; students confirm what to save. Visible artifacts, student explanations and model feedback stay separate. This records submitted evidence, not verified authorship, execution or mastery. Recent saved work informs Pip and planning; deletion removes it from future journal context.

Validation: TypeScript and 169/169 Linux tests passed, along with the inactive production build. Public synthetic image and text workflows passed using actual NVIDIA inference, including cross-user refusal, field-tampering refusal, original-text preservation, duplicate-safe save/close, pause/resume, export and deletion. Production Journal UI was inspected. Backup/restore attachment tests pass. See WORK-JOURNAL.md for limits and remaining evaluation. Broad teaching accuracy, real student engagement, handwriting and all diagrams remain unproven; final submission/demo preparation remains.

### Upload controls

Replaced both native file-picker appearances (Journal and Course Library) with one theme-aware, keyboard-accessible upload surface. Native selection, required-field validation, accepted types and single/multiple behaviour remain intact; selected filenames/counts are visible. Journal's long technical limits disclosure is replaced by a brief processing notice, with existing validation handling rejected files. TypeScript, 169 tests and production build passed. Public browser checks confirmed both file choosers open and show a selected synthetic TXT file without submitting it. The free OpenCode review attempt produced no completed review; independent source and browser checks supplied acceptance evidence.

### Learning-studio landing page and faster exploration

The landing page now uses a bold editorial opening, an interactive three-example desk, visual practice/progress sections and previews drawn from the actual theme catalog. Examples are labelled; they do not pretend to make live model calls. OpenCode GLM reviewed the page. Accepted fixes include preserving theme-card positions on hover, reading actual theme definitions and increasing small mobile labels.

Role exploration now saves and returns web sources before a separate bounded NVIDIA explanation request. The same query reuses its workspace's saved results for 15 minutes; explicit locations/questions are preserved rather than forced into India-internship searches. Two-character terms such as AI are accepted, and clearing the input no longer restores the profile goal. Lost responses can recover saved results without repeating the generation; an unfinished guide can be resumed. Sources stay visible when an explanation fails. Source-check failures discard the individual unsupported requirement rather than hiding other supported requirements. This is substring grounding, not independent semantic verification.

Observed public Data engineering check: sources in 1,528 ms, cached replay 16 ms, separate explanation request 6,239 ms (source-only fallback in this run). An independent browser AI query returned a live guide. Source persistence, cached identity, foreign-search refusal and completed-explanation replay passed. These are sample timings, not guaranteed response times; fresh searches still depend on Tavily and explanations on Nebius. Final checks: TypeScript and 172 tests, plus production build. OpenCode's separate DeepSeek review attempt returned no completed findings.

Final deployment retest: a fresh Data engineering workspace returned sources in 291 ms, cached replay in 9 ms and a live source-checked NVIDIA brief in 1,087 ms. Provider caching/latency varies; these timings do not promise instant fresh results. Browser checks confirmed AI is accepted, the query can be cleared, and a live guide persists after reload. Direction's inverted labels and next-step text now use their actual surface/button foreground colours.

### Useful interaction release

Today has a local 15/30/60-minute time-pocket preview and a replay-safe save action. Course Library has real document covers and subject filters. Study Room progressively reveals its worked example, with an unsaved, ungraded prediction scratchpad. Journal uses an actual-record learning trail. Full Pip chat can pin explanations/code beside the transcript, with per-chat visit-only memory, no silent eviction and mobile focus handling. Successful saves have a reduced-motion-aware Pip reaction. See INTERACTIONS.md for behaviour and limits. TypeScript, 177 tests, production build and synthetic public/browser workflows passed. OpenCode drafted the bookshelf/canvas; supervisory review fixed theme, state isolation and accessibility issues. A real model citation-length failure was reproduced and corrected without accepting invented quotes.

### Role-to-practice bridge and daily settings recovery

Direction now builds three actionable steps from web excerpts and recent learner records, including Journal entries, with a beginner route when no records exist. Each step has a deliverable, inspectable sources and a specific Pip handoff. Source pages arrive before the model path. Derived claims are invalidated on Journal changes/deletions; cached pages can be reused. Daily settings now recover uncertain saves through a server read rather than replaying a version-incrementing write, and offer an inline reload on failure. See ROLE-BRIDGE.md for provenance and validation limits.

### Add work attachments and time no-op

Add work now supports document upload and an atomic task+library save, with a direct study link from the task. Selecting an already-saved time budget sends no request; the server preserves the current plan on same-budget requests. The misleading time toast is gone. 205 tests and the release build passed; live synthetic attachment/replay/ownership checks and budget checks are included in scripts/attached-work-smoke.mjs and scripts/delight-smoke.mjs.

### MIT discovery, Pip latency and platform recheck

Course discovery now accepts MIT domains only and uses curated MIT DSA/OS/database pages without a web search. Pip removes redundant source/latest-message copies and skips query-classification inference for known public technical topics; recent search results are cached by workspace/query with failure, expiry and isolation checks. Existing chat startup uses one read; pending user text appears immediately. Source validation, auth errors, version conflicts and daily allowances remain enforced. Inference timing/token logs contain metadata only. 214 tests and the release build passed. Native response schemas now constrain field types before independent source validation. See PERFORMANCE.md and NVIDIA-NEBIUS.md for the actual before/after sample, live provider/vision/background checks, remaining submission tasks and limits.
