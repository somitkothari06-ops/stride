# OpenCode implementation handoff — 28 October 2026

Goal: complete a useful loop for second/third-year engineering students: choose an outcome, work, submit an artifact, explain it, review a progress record, and return to an appropriate next challenge.

Status: delegated draft, NOT implemented/verified/deployed merely because this file exists.

## Scope in order

1. Evidence journal: text/pasted code, TXT/MD and PNG/JPEG/WebP attachments with strict byte/signature/count bounds. Keep image files private, owned and explicitly submitted; reject SVG, executables and unsupported types. Use existing NVIDIA text/vision model paths. Extract a proposed record: activity, what artifact shows, student explanation, uncertainty, next suggestion. Distinguish student-reported information, artifact observations and model feedback. Never claim authorship, work date, mastery or test execution has been verified. Preserve upload timestamps separately from the student's activity date.
2. Review then save: no automatic personal-memory mutation. Use server-bound previews, expiry, ownership, source integrity, explicit confirmation, atomic duplicate-safe commit and independent delete/export. Keep original explanation and attachments traceable. Treat uploaded content as untrusted. Reuse calendar resolution, allowances and safe storage boundaries. Extend full-backup/restore/cleanup if originals are retained; do not silently strand files outside recovery.
3. Focused session: choose an outcome/time and optionally existing coursework; preserve a resumable session across reloads; record work/explanation through the journal; close with a compact reviewed progress entry and continuation point. Do not auto-submit answers, run arbitrary code or require a fixed one-hour timer.
4. Return: show one saved continuation or a small ungraded transfer question, based on the student's actual confirmed record. Allow continue/change/skip. No fabricated proficiency score or guaranteed-memory claim.

## Product requirements

Use existing themes/semantic colours, readable bold questions, raised buttons, concise language and responsive layouts. No bright-blue body text, duplicate capture forms, dead controls, fake streaming or AI status badges. Keep Pip as a companion rather than replacing working study/chat routes. Add only a small clear navigation entry. Preserve existing accounts, profile, chats and PDF study.

## Verification and boundaries

Meaningful tests: cross-user attachment access, invalid/spoofed/oversized files, preview tampering/expiry, relative dates, confirmation/replay, concurrent updates, export/delete, backup/restore, session resume, empty/error/limit paths, removed evidence excluded from future context. Run npm run check and npm run build using synthetic local data only. Live model and browser tests require later supervisor review.

Work only in the delegated source copy. No .env values, student PDFs, credentials, original repository edits, SSH, service changes, live model calls, accounts, deployments or remote Git writes. Do not install a new framework or replace the current architecture. Use mocks for model tests. Document incomplete work honestly.

## Acceptance record

Return HELPER-RESULT.md with changed files, implemented versus incomplete scope, test outcomes, new limits/migrations, risks and manual checks. Completion requires supervising review and production testing; a helper's success claim alone is insufficient.

## Work Journal — October 28 reviewed release

OpenCode's draft was independently reviewed, repaired and deployed. The new Journal connects a resumable focus session, reviewed work logs (text/code, TXT/MD and PNG/JPEG/WebP) and a saved next step. NVIDIA Lightning and Super VL analyse the submission; students confirm what to save. Visible artifacts, student explanations and model feedback stay separate. This records submitted evidence, not verified authorship, execution or mastery. Recent saved work informs Pip and planning; deletion removes it from future journal context.

Validation: TypeScript and 169/169 Linux tests passed, along with the inactive production build. Public synthetic image and text workflows passed using actual NVIDIA inference, including cross-user refusal, field-tampering refusal, original-text preservation, duplicate-safe save/close, pause/resume, export and deletion. Production Journal UI was inspected. Backup/restore attachment tests pass. See WORK-JOURNAL.md for limits and remaining evaluation. Broad teaching accuracy, real student engagement, handwriting and all diagrams remain unproven; final submission/demo preparation remains.
