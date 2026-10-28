# Work journal and focused sessions

Open Journal from the workspace navigation. Focus, Log work and My progress separate working, reviewing a submission and reading saved records. Today shows an active session or the saved continuation when one exists.

## What it does

- Choose a concrete outcome and 15–240 approximate minutes, optionally linking coursework or a course document. This is not a measured timer. Pause/resume survives reloads. Work with Pip opens contextual chat; linked notes open the existing study room.
- Paste an explanation/code and attach up to five TXT/MD or PNG/JPEG/WebP files. Text files are bounded at 256 KB and images at 3 MB each. The submission is at most 12,000 characters, and combined submitted/file text must fit 24,000 characters; oversized text is rejected rather than silently clipped.
- The configured NVIDIA text or vision model proposes an activity, interpretation, feedback, uncertainty and next suggestion. Review before saving. The activity/explanation are editable student reports; model-owned fields are bound to the actual stored preview. If model review is unavailable, a clearly unassessed record can still be reviewed and saved.
- Preserve original submitted text and private attachments alongside the reviewed record. Activity date is explicit student input; upload/save timestamps do not prove when work was done. No authorship, test execution, mastery or readiness is certified.
- Close with a student-written summary and continuation. A later visit offers that continuation or a small ungraded question derived from a saved topic. These transfer questions are deterministic prompts, not a validated adaptive learning model.
- Saved, bounded journal context informs Pip, practice preparation and next-step planning. Deleting evidence removes it from new selected journal context and filters chat exchanges/citations referring to it out of future prompts. Historical chat text and older backups may still contain references.

## Privacy, persistence and limits

Attachments are private owner-scoped files under the configured data directory's evidence/ folder; they are never public assets. Confirmation previews expire after 15 minutes. Confirmed save receipts remain replay-safe beyond preview expiry. Files/types/signatures and stream size are bounded; SVG, executables and other unsupported formats are rejected. The journal holds at most 60 records including session summaries. Session mutations carry the current focus ID, and close retries do not create duplicate records.

Full backup format 2 includes confirmed evidence files and restores format 1 archives too. Restores clear pending reviews and account sessions. Orphan files have the existing 24-hour cleanup grace period. The journal JSON export contains record text and file metadata; it is not a standalone file archive. Raw attachments can be downloaded individually while their entry exists.

The current deployment is a single process using SQLite. This is a working hackathon flow, not a claim of distributed storage, unlimited memory, full-file support or independent verification. Real student learning outcomes, broad handwriting/diagram accuracy and broader mobile/microphone trials remain unproven.

## Verification

OpenCode implemented the initial draft and two repair passes. Independent review then corrected asynchronous SQLite transaction interleaving, attachment-count/model-limit mismatch, text clipping, model-field substitution, original-text traceability, stale session IDs, full-journal limits, expired replay receipts, and hidden/removed continuation behaviour. The supervising pass also connected journal context to the existing AI flows and simplified the UI.

Synthetic HTTP checks cover upload/review/confirmation, private image access, cross-user refusal, tampering, original text, duplicate-safe saves/closing, pause/resume, skip, export and deletion. A private staged live call used NVIDIA vision to identify red/blue sides in a generated two-block PNG; the full image workflow passed. Offline checks also exercised the explicitly unassessed fallback. These are synthetic integration checks, not student research or a teaching-accuracy benchmark.

Final public verification: 169/169 Linux tests and production build passed. Live PNG vision and TXT/text analysis both passed through the public HTTPS service; all synthetic ownership, tampering, replay, export and deletion checks passed.
