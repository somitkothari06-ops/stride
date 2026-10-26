# Pip: capture first, confirm where it goes

Pip is Stride's small floating companion on the landing page and workspace. It takes typed words or the existing browser dictation, then proposes up to six entries: coursework, personal context or a thought. It is an in-app capture tool, not a desktop agent or a general-purpose chat assistant.

## Student flow

1. Open Pip from the bottom-right mascot or **Have something on your mind?**
2. Type or dictate. Microphone input starts only when tapped; typed input is always available. The browser's recognition service may process audio. Stride stores text, not recordings.
3. **Find its place** sends the capture to the existing Nebius/NVIDIA model when connected. Personal source text is treated as data, never instructions. If AI sorting is unavailable or invalid, the full original is kept as one unsorted thought; no invented dates/profile updates are applied.
4. Review compact cards. Check dates, edit details, change the destination or uncheck entries. Exact source excerpts remain available. **Save selected** is the only filing action.
5. Coursework appears in My work; personal context is appended to the selected About You field; passing thoughts appear in the thought inbox. The workspace refreshes after a save.

Pip does not change name, college year, availability or a declared goal, and does not edit/delete existing coursework. Personal-context changes preserve the existing field and reject over-capacity additions rather than truncating them. Identity/profile setup still has its own page. The dock is hidden on login and About You to avoid competing with authentication and unsaved profile-form edits.

## Safety and storage

- Reviews last 15 minutes and are bound to the workspace identity and its planning revision. Each workspace can hold at most 12 pending reviews. Raw drafts are cleaned on later review creation; committed rows immediately discard the draft source and proposal payload, keeping a short-lived retry marker.
- Commit reads the current workspace and applies the complete selected batch in one SQLite transaction. Repeating the same review commit does not add duplicates. Separate explicitly created captures remain separate records.
- A stale revision, a different workspace, a rotated guest identity, invalid evidence or an impossible date is rejected. If any selected addition exceeds a limit, the whole save rolls back and the student can correct the review.
- Submitted work keeps its original source; confirmed profile/notes keep the selected text. Active workspace deletion is not forensic erasure from SQLite WAL/backups. Temporary drafts and snapshots are private and must not enter helper prompts or Git.
- Unsaved client text stays in the current page's panel; leaving the page loses that unsaved draft. Minimizing Pip retains it on that page. There is no continuous/background listening, new transcription backend or spoken output.

## Verification and limits

Automated checks cover mixed destinations, preserving existing profile context, full-batch rollback and corrected retry, same-review idempotence including thought-only captures, long-story preservation, owner/claim isolation, expiry, stale revisions, invalid dates, unsupported profile fields, invented quotes and bounded pending reviews.

`node scripts/companion-smoke.mjs --allow-live` makes one explicit synthetic live capture. It checks the returned quotes/destinations/date, scoped save, persistence, duplicate-submit handling and cross-origin refusal. `STRIDE_SMOKE_IDS_FILE` privately records only synthetic session hashes for cleanup; keep actual-call usage counters when removing synthetic data. A separate browser check inspects review controls without committing synthetic entries into an existing browser workspace.

These checks do not establish reliable classification for every student's speech. Real Safari microphone permissions, accents, fillers, mixed languages, ambiguous dates and usefulness need human trials. Grounded quotes do not certify that every model interpretation is correct; student review remains necessary. Stronger ASR and broader agent actions are future work.

Pip uses a rounded SVG character with gentle idle movement and pointer-following eyes. Gaze follows page pointer coordinates only; it does not use a camera. Reduced-motion preferences disable movement and gaze tracking. The input panel keeps one microphone control; service and voice information lives in Connections instead of repeated capture disclosures.
