# My Build

A student chooses one project they care about and develops it through saved attempts. This is an evolving project desk, not a generated finished app or an assessed skill certificate.

## Flow

- `/build`: choose a starter or write an idea; edit the subject and choose 15/30/60 minutes. NVIDIA through Nebius drafts a short project plan. Creating the project is explicit.
- The workbench shows one concrete task, a deliverable and a question. A student can paste code/explanation, attach supported text/image files for reviewed Journal capture, or select existing owned Journal work. File review is separate from project feedback; nothing is silently certified.
- Save an attempt to get concise formative feedback plus a suggested continuation. The current step changes only after the student chooses Continue. A repair step is valid; attempts do not imply mastery or execution.
- The trail retains the original task, submitted text, feedback and live source references. Pause/resume, confirmed deletion and JSON export are available. Export is the project record, not a bundle of original attachment bytes.
- Today and navigation link to My Build. Pip receives the current project and a bounded latest attempt. The landing page includes an explicitly illustrative project example.

## Storage and safety

Project state is owner-scoped inside the existing persisted workspace, optional for legacy workspaces. Build versions, UUID receipts, transaction-time checks and single-process in-flight deduplication protect retries and stale tabs. Fifty attempts fit one project. A deleted project's earlier create request cannot resurrect it. Versions are also required for create.

No model call runs while a database transaction is held. Model outputs use native Nebius schemas and independent Zod/source-ID checks. A changed/deleted cited record during inference rejects the save. Build source passages are not duplicated in storage: the response resolves references from currently retained records. Removing a linked Journal entry removes its build references and invalidates dependent feedback, preserving the student's separately submitted text. Historical chat text and backups have their existing separate retention behavior.

Changing themes uses paired hero/heroInk and cta/ctaInk roles. Pending work preserves drafts, upload review blocks submission until saved/removed, keyboard focus is visible and motion respects reduced-motion preferences.

## Retrieval across time

Pip and project planning now retrieve relevant saved thoughts, coursework, attempts, Journal entries, earlier user turns across chats, and build records. Selection uses topic aliases and lexical relevance with a bounded prompt budget; recency breaks relevance ties. Older current-chat user turns remain searchable beyond the recent turn window. User statements and model feedback are labelled separately. Source IDs incorporate source content, so edits/deletions invalidate old references. Sources are revalidated at chat commit.

This is not an unlimited or fully semantic memory engine. Vague references, unfamiliar synonyms and multilingual paraphrases may not retrieve the right record; Pip should ask for clarification. Saved chat limits remain 50 chats and 100 exchanges per chat. It does not replay all history on every request, infer mastery, execute student code or claim to know missing records.

## Verification

Automated checks cover the state transitions, replay/conflicts, foreign Journal IDs, invented citations, reference deletion, old relevant records among 70 recent unrelated notes, correction/deletion invalidation and cross-chat student-word retrieval. Public live tests cover NVIDIA create/review, explicit continuation, pause/resume, owner isolation and deletion replay. The live memory check recalled an old project's name and transfer-history question with a source citation. Browser verification uses only clearly marked synthetic project work and attachments.

OpenCode DeepSeek drafted the project desk; its output was independently corrected for auth fallback, exact retries, editable subjects, attachment handling and theme contrast. A separate OpenCode GLM review identified the source-copy deletion issue and a late-retry inference gap; both were fixed. Its absent-feedback warning was not established for validated current Journal records, but a defensive fallback was added.

## Work area and first visit

The project desk separates Workspace, My attempts and Plan. Attempt history is newest-first and paginated six per view. Notes/Code modes share the current draft. JavaScript runs only after an explicit Run click, in a sandboxed frame and bounded worker; network access is blocked, console output bounded and the worker terminated after two seconds. This supports small synchronous browser JavaScript, not Node.js/packages. HTML/CSS has a script-disabled, external-resource-blocked preview. Other languages are editing/feedback only and must run in the student's own tools. A browser result remains separate from model feedback and is not persisted as a verified skill.

The new first visit asks what the student needs: something due, understanding, a project, or space to explore. A short name/year/time setup then opens the relevant existing tool. Extra story/context stays optional and is saved exactly as written, without an organization-model call or inferred traits. Existing personal fields are preserved; returning profile editors open their saved form directly. OpenCode drafted this flow; supervisory review fixed theme roles, tuple types, sign-out clearing and successful-save unload behavior.
