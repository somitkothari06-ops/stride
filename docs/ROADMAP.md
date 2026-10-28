# What is complete and what remains

Updated October 27, 2026. This is a development checkpoint, not a finished hackathon submission. No percentage-complete estimate is claimed.

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
| Pip conversation and capture | Separate named chats, teaching, follow-ups, automatic web lookup when useful, contextual entry points and reviewed saving; recent chat stored with the workspace | Real student language and microphone trials; quality of explanations, retrieval and personalisation |
| Live internship grounding | Key configured privately; live retrieval and source persistence verified, including Google/IBM/Atlassian internship hubs. AI failure retains labelled source-only results | Valid account access, real relevant sources, eligibility/freshness handling, observed work linked honestly |
| Cross-device user accounts | Supabase password and social flows implemented; real GitHub login observed; real Google public-HTTPS login observed; synthetic two-device/user checks pass | Confirm corrected profile onboarding, Google audience access for other testers, public email delivery and password recovery |
| Automatic daily preparation | Not implemented | Authenticated scheduled job, opt-in, idempotent runs, freshness display and an observed closed-browser run |
| Public judge access | Public HTTPS preview deployed and fresh-browser access checked; secure cookies and pinned OAuth redirects verified | Independent judge/student trial and hosting runway confirmation |
| Broad file intake | Confirmed text extraction from PDF/PPTX/DOCX/TXT/MD, with locators and warnings | OCR for scans/handwriting, layout/equation fidelity, stronger parser isolation and real-course trials |
| Executed practice checks | Authored guided prompts/model feedback only | Optional constrained runner with reviewed fixtures and explicit execution conditions; never claim tests ran before this exists |
| Production data operations | Transactional SQLite guest/account workspaces; encrypted off-volume snapshot restore verified; consistent snapshot tool and restore drill | Versioned migrations, off-volume scheduled backups, retention/deletion semantics and request idempotency; Devlab process supervision and crash recovery are now checked |
| Product/model quality | Representative synthetic checks only | Unfamiliar real student tasks, adversarial/ambiguous cases, useful feedback, measured quality/latency/cost and fixes |
| Accessibility and polish | Shared visual pass and onboarding simplification checked; single audio notice, keyboard guards, source review and failure-state checks | Focus/keyboard/mobile review, robust empty/error/loading paths and final complete-flow review |
| Submission package | Initial README/license/source exist | Final demonstrated scope, judge instructions, authentic tool feedback, short public video and completed Devpost entry |

## Suggested next work order (revised checkpoint)

1. Improve live role-source relevance and validate a small real sample; Tavily retrieval is connected. Keep academic constraints in control.
2. Public HTTPS and pinned authentication are now verified. Confirm hosting runway, independent-user access and managed editor ingress hardening.
3. Google and short conversational onboarding are implemented. Finish independent audience testing, custom email delivery and password recovery. GitHub sign-in, one-time guest claim, per-device logout, refresh and synthetic cross-device/two-user checks now pass.
4. Implement opted-in scheduled daily preparation with persistent state and safe retries if it remains in the demonstrated scope.
5. Complete failure recovery, data operations and meaningful student/model trials.
6. Freeze a demonstrable stable version, rehearse the video and finish the submission package.

These are team tasks. They have not automatically been assigned to the friend, and the current checkpoint does not mean either builder's entire role is complete. Coordinate file ownership before working in parallel.

Voice capture now uses browser speech recognition with typed fallback. Before the demo, validate real microphone recognition and permission/error behavior in the target Safari/Chrome versions; mixed-language accuracy and a universal transcription backend remain open. See VOICE-CAPTURE.md.

## Account setup checkpoint, October 25

Tavily is now provisioned and its key is installed privately. Supabase was provisioned and CLI-linked on October 26; app identity integration is implemented; Google setup and public email delivery remain pending. Tavily's official [Nebius Builders claim page](https://www.tavily.com/nebius-builders) advertises $25 free credit, no card required, once per customer. The hackathon's [official session update](https://nebiusglobalaihackathon.devpost.com/updates/46337-build-session-recording-resources-available-live-coding-your-first-app-with-nebius) also lists code BBDEVPOST; it does not state the amount, expiry or whether it stacks with other offers. The [standard free plan](https://www.tavily.com/pricing) provides 1,000 credits/month. The user's Tavily screenshot subsequently showed 4,125 allocated credits before testing; this is a historical screenshot, not a current balance check. Keep API keys in the private local environment file, then transfer only the relevant value to the server; never overwrite the existing Nebius configuration with the local template.

Personal-setup voice-model replacement is deferred. Later evaluation should include fillers, accents, subject names and mispronunciations; preserve the original transcript and require review of dates/names/numbers rather than silently inventing corrections. The current shared-question UI and synthetic workflow checks are complete for this checkpoint.

Current independent work completed: private health endpoint, managed app-process restart, PID-identity safety, fresh database snapshot and two crash-recovery drills. The app recovered with saved synthetic data intact. Public HTTPS judge access, Google/provider email setup and opted-in scheduled briefs remain incomplete; GitHub accounts are implemented. See DEPLOYMENT.md.

Security review and residual hardening: see SECURITY-REVIEW.md. Colour alternatives remain separate previews until chosen.

October 27 update: Settings/theme selection, compact navigation, account logout refusal, full supported PDF-page intake and a dedicated text/vision document study room are implemented and tested with synthetic inputs. Still open: automatic full-data backup including retained PDFs; expired upload-preview orphan cleanup; broader graphics/STT quality evaluation and final judge/demo/submission preparation. See STATUS.md and DOCUMENT-STUDY.md for observed evidence and limitations.

28 October: replaced the fixed course-comparison selector with editable subjects and explicit university-page discovery. Comparison still uses selected passages/search excerpts, not an exhaustive full-course review. A larger cached course catalog and shared proof storage would be separate future work.

## Work Journal — October 28 reviewed release

OpenCode's draft was independently reviewed, repaired and deployed. The new Journal connects a resumable focus session, reviewed work logs (text/code, TXT/MD and PNG/JPEG/WebP) and a saved next step. NVIDIA Lightning and Super VL analyse the submission; students confirm what to save. Visible artifacts, student explanations and model feedback stay separate. This records submitted evidence, not verified authorship, execution or mastery. Recent saved work informs Pip and planning; deletion removes it from future journal context.

Validation: TypeScript and 169/169 Linux tests passed, along with the inactive production build. Public synthetic image and text workflows passed using actual NVIDIA inference, including cross-user refusal, field-tampering refusal, original-text preservation, duplicate-safe save/close, pause/resume, export and deletion. Production Journal UI was inspected. Backup/restore attachment tests pass. See WORK-JOURNAL.md for limits and remaining evaluation. Broad teaching accuracy, real student engagement, handwriting and all diagrams remain unproven; final submission/demo preparation remains.
