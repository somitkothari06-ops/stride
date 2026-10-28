# Stride release audit — 28 October 2026

This is an evidence log, not a promise that every possible input works. Production runs on the existing CPU Nebius Devlab; inference uses NVIDIA models through Nebius Token Factory. See NVIDIA-NEBIUS.md for the runtime integration and submission requirements.

## Completed checks

- Current source passes TypeScript checks and 123 automated tests. Production builds succeeded in an inactive release directory.

- Previous production checkpoint: all nine disposable public workflow checks passed: personal profile, capture, companion, separate Pip chats, course library, role search, live intake/plan/session/feedback, contextual Pip conversation, and public authentication start/cancel. These tests do not prove a new person's OAuth or microphone experience.
- Calendar checks use the student's timezone and actual request date. On 28 October 2026, “this Saturday” resolves to 31 October 2026. Copied messages need their original date for relative deadlines. Both capture paths were tested through actual save. Ambiguous dates stay blank for review.
- All 21 palettes and four button styles are checked for readable foreground/background pairs. Preview/cancel was exercised in the browser without replacing the user's saved theme.
- Backup recovery was tested with a full encrypted archive copied to the Mac, including retained PDF files. Restored sessions are cleared, anonymous identifiers rotated and scheduled generation disabled. A large PDF exposed a base64 validation stack overflow; the validator and regression test were fixed. The student's PDF content was not inspected by the development assistant.
- Daily preparation has consent/version checks, persistent leases, duplicate prevention, retry limits, stale-context protection and opt-out tests. The host timer is installed; no real user was opted in by the developer.
- Direct external editor port 8080 was blocked, while host loopback editor access, SSH and public app health remained reachable.

## Fixes during this audit

- Settings use a three-way field merge. Unrelated coursework or another preference changing no longer rejects a theme save. Same-field conflicts still require review. Replaying a successful save after a lost response does not increment its version twice.
- Only explicitly replay-safe requests retry automatically. Plan transport failures attempt to recover a newly saved plan via a read; they do not blindly submit another generation. Existing work and drafts remain visible on failure.
- Builds use an inactive release directory, preserving the current server's files and old static chunk URLs. Activation still requires a short supervised restart; this is not zero-downtime deployment.
- Course upload, intake and answer drafts survive closing their panels. Successful saves clear the appropriate draft.
- Single-term course searches retrieve matching excerpts. Removed observations cannot enter preparation/planning context. Editing or completing work clears its outdated prepared session.
- Optional web-routing failure does not prevent an otherwise available Pip response. Model output validation failures are distinguished from transport connection failures.
- Capture saves must use source spans from the actual stored review, without repeating them. Users can still deliberately edit suggested titles, dates and destinations before confirming; this is not an independent verification of their statements.
- Guest creation and upload parsing have bounded, per-process request/concurrency limits. These complement daily model budgets; they are not distributed abuse protection.

## Development helpers

OpenCode free GLM and DeepSeek handled isolated implementation and source audits for button controls, backup recovery, AI integration, user flows, operations and network/retry logic. Findings were independently checked; misleading claims were rejected. KiroCrew was found to use a Codex-backed adapter here, so further heavy tasks were directed to OpenCode to avoid spending the same allowance.

## Remaining limits and checks

- Safari's reported “Load failed” has not been reproduced as a specific server exception. One development SSH transfer also briefly timed out while public health later returned 200. That supports investigating connectivity, not assigning a proven cause. Privacy-filtered access timing/status logs help diagnose future failures without recording cookies, request URLs or response headers.
- Browser speech quality, unusual accents, real new-account OAuth/email recovery and device-specific layout require representative human checks. Browser speech recognition remains the current transcription method.
- Text chat uses selected saved context and bounded history, not unlimited memory. PDF study can invoke the configured vision model for selected rendered pages; ordinary text chat does not automatically see every diagram.
- Source-linked model feedback is still model interpretation. Exact matching source quotes do not establish mastery, eligibility, code execution or semantic truth.
- Gmail/Drive access and an isolated code runner are not implemented. Google sign-in grants account identity only.
- Public-host funding and uptime through the judging period need confirmation. The laptop copy runs only while the Mac is awake and connected. No always-on independent offsite backup is claimed.
