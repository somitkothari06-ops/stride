# What is complete and what remains

Updated October 26, 2026. This is a development checkpoint, not a finished hackathon submission. No percentage-complete estimate is claimed.

## Working and checked

- The app runs on the existing Nebius Devlab and has public GitHub source with automated checks.
- Today, My work, Memory and Direction have responsive interfaces.
- Text intake can extract candidates, let the student confirm details and save work.
- Confirmed deadlines and availability influence planning; changed context makes previous plans stale.
- Live NVIDIA Nemotron inference works for extraction, planning, practice preparation and labeled model feedback.
- Attempts and sources are remembered; editing/removing records changes future context. Data can be exported.
- Separate opaque browser sessions keep their workspace records separate; storage survives normal page reloads.
- Live-request status is stored against the exact provider configuration. Presence of a key is distinguished from a successful live response.
- The production build and automated tests pass. A synthetic live integration flow has passed.
- A private SQLite snapshot/verification/restore tool is available; restore requires a new directory and never overwrites the live database. See [recovery instructions](RECOVERY.md). Off-volume backup scheduling remains pending.
- Signal is the user-selected UI. A landing page, editable About You flow and optional personal narrative now connect to the study workspace. Course uploads support reviewed text extraction and a small source-backed course comparison; see [current evidence](STATUS.md).

## Incomplete

| Work | Current state | Completion evidence needed |
|---|---|---|
| Pip capture companion | Typed/browser-voice capture with proposed coursework/profile/thought destinations, editable review and atomic confirmed save; synthetic live mixed capture checked | Real student language and microphone trials, useful classification and clear failure handling across devices |
| Live internship grounding | Key configured privately; live retrieval and source persistence verified, including Google/IBM/Atlassian internship hubs. AI failure retains labelled source-only results | Valid account access, real relevant sources, eligibility/freshness handling, observed work linked honestly |
| Cross-device user accounts | Supabase password and social flows implemented; real GitHub login observed; Google setup pending; synthetic two-device/user checks pass | Google credentials/consent test, public email delivery, password recovery and stable HTTPS origin |
| Automatic daily preparation | Not implemented | Authenticated scheduled job, opt-in, idempotent runs, freshness display and an observed closed-browser run |
| Public judge access | Development SSH tunnel only | Stable HTTPS URL usable from a fresh independent browser, isolated demo, documented access and hosting runway |
| Broad file intake | Confirmed text extraction from PDF/PPTX/DOCX/TXT/MD, with locators and warnings | OCR for scans/handwriting, layout/equation fidelity, stronger parser isolation and real-course trials |
| Executed practice checks | Authored guided prompts/model feedback only | Optional constrained runner with reviewed fixtures and explicit execution conditions; never claim tests ran before this exists |
| Production data operations | Transactional SQLite guest/account workspaces; consistent snapshot tool and restore drill | Versioned migrations, off-volume scheduled backups, retention/deletion semantics and request idempotency; Devlab process supervision and crash recovery are now checked |
| Product/model quality | Representative synthetic checks only | Unfamiliar real student tasks, adversarial/ambiguous cases, useful feedback, measured quality/latency/cost and fixes |
| Accessibility and polish | Shared visual pass and onboarding simplification checked; single audio notice, keyboard guards, source review and failure-state checks | Focus/keyboard/mobile review, robust empty/error/loading paths and final complete-flow review |
| Submission package | Initial README/license/source exist | Final demonstrated scope, judge instructions, authentic tool feedback, short public video and completed Devpost entry |

## Suggested next work order

1. Improve live role-source relevance and validate a small real sample; Tavily retrieval is connected. Keep academic constraints in control.
2. Establish public judge access and evaluation-period hosting before treating a development tunnel as deployment; pin the HTTPS auth origin and verify a fresh external-browser login.
3. Finish public account onboarding: configure Google, custom email delivery and password recovery. GitHub sign-in, one-time guest claim, per-device logout, refresh and synthetic cross-device/two-user checks now pass.
4. Implement opted-in scheduled daily preparation with persistent state and safe retries if it remains in the demonstrated scope.
5. Complete failure recovery, data operations and meaningful student/model trials.
6. Freeze a demonstrable stable version, rehearse the video and finish the submission package.

These are team tasks. They have not automatically been assigned to the friend, and the current checkpoint does not mean either builder's entire role is complete. Coordinate file ownership before working in parallel.

Voice capture now uses browser speech recognition with typed fallback. Before the demo, validate real microphone recognition and permission/error behavior in the target Safari/Chrome versions; mixed-language accuracy and a universal transcription backend remain open. See VOICE-CAPTURE.md.

## Account setup checkpoint, October 25

Tavily is now provisioned and its key is installed privately. Supabase was provisioned and CLI-linked on October 26; app identity integration remains pending. Tavily's official [Nebius Builders claim page](https://www.tavily.com/nebius-builders) advertises $25 free credit, no card required, once per customer. The hackathon's [official session update](https://nebiusglobalaihackathon.devpost.com/updates/46337-build-session-recording-resources-available-live-coding-your-first-app-with-nebius) also lists code BBDEVPOST; it does not state the amount, expiry or whether it stacks with other offers. The [standard free plan](https://www.tavily.com/pricing) provides 1,000 credits/month. The user's Tavily screenshot subsequently showed 4,125 allocated credits before testing; this is a historical screenshot, not a current balance check. Keep API keys in the private local environment file, then transfer only the relevant value to the server; never overwrite the existing Nebius configuration with the local template.

Personal-setup voice-model replacement is deferred. Later evaluation should include fillers, accents, subject names and mispronunciations; preserve the original transcript and require review of dates/names/numbers rather than silently inventing corrections. The current shared-question UI and synthetic workflow checks are complete for this checkpoint.

Current independent work completed: private health endpoint, managed app-process restart, PID-identity safety, fresh database snapshot and two crash-recovery drills. The app recovered with saved synthetic data intact. Public HTTPS judge access, authenticated accounts and opted-in scheduled briefs remain incomplete. See DEPLOYMENT.md.
