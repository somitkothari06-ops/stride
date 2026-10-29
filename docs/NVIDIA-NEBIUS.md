# NVIDIA × Nebius implementation evidence

## Competition alignment

Checked October 28 against the [official rules](https://nebiusglobalaihackathon.devpost.com/rules) and [overview](https://nebiusglobalaihackathon.devpost.com/). The submission deadline is October 30, 2026 at 22:30 India time. Runtime use of Nebius inference/cloud and an NVIDIA open model is required. Personal AI is Stride's intended track; persistent private context, chosen tools and opted-in background work form its demonstrated case. This is a technical assessment, not an organiser's eligibility ruling.

Submission still needs a working judge-accessible link, public licensed source with setup instructions, an English description, a public YouTube demo under three minutes, a chosen track and authentic platform feedback. Access must last through December 15. Judging weighs implementation, coherent design, credible impact and the idea. Serverless deployment is encouraged, not compulsory. Current hosting credits/runway through judging have not been independently confirmed.

## Actual runtime, not development-helper branding

| Component | Runtime | What it does |
|---|---|---|
| Task intake, planning, practice, feedback, personal-context parsing, Pip and course/role synthesis | `nvidia/Nemotron-3_5-Lightning` on Nebius Token Factory | Structured model outputs validated by the application |
| Selected PDF-page image reading | `nvidia/Nemotron-3.5-Super-VL` on Token Factory | Images plus extracted text, with page references and uncertainty |
| Web discovery | Tavily | Retrieves public sources for Pip/Direction; model synthesis is distinct from retrieval |
| Application and private persistent storage | Existing Nebius CPU Devlab | Next.js, SQLite, retained PDFs, supervised web process and background jobs |
| Voice transcription | Browser speech recognition | Browser-dependent dictation, with typed fallback; not an NVIDIA speech model |
| Development assistance | OpenCode free helpers; supervising Codex | Source drafting/reviews only; not the student-facing inference provider |

The Devlab has no GPU. Model inference is hosted by Token Factory; the application does not train or self-host the NVIDIA models. No NeMoClaw/OpenShell/Hermes integration or universal speech backend is claimed.

## Observable AI workflow

Pip receives the latest request, a bounded recent chat window, selected workspace context and relevant supplied passages. Web lookup has its own result status and bounded sources. Structured replies are checked before storage. This describes request construction and validation, not access to a model's private internal reasoning.

Intake proposes work and dates for review. Calendar arithmetic now runs in ordinary code using an explicit timezone/reference date, so a plausible-looking model date cannot become a deadline without source support. Extracting a task and confirming/saving it are separate tested steps.

Practice and document study ask for explanations, mechanisms, worked examples and formative feedback. Exact text quotes must match supplied passages. Page-image descriptions remain model interpretation; they can be wrong. Uploaded artifacts and self-reported attempts do not establish authorship or mastery.

Memory is persistent storage, not unlimited model context. Chats, coursework and saved attempts persist, but only selected/bounded context reaches each request. There is no claim that every old chat or every page of a long PDF is read on each turn. A lesson uses the selected page range.

Daily preparation is optional and account-scoped. A closed-browser worker prepares a single next step from current confirmed work, with timezone scheduling, retry/idempotency controls and consent checks. It does not send mail, submit assignments, apply for jobs or modify external accounts.

## Feedback grounded in this build

- Native structured responses and the OpenAI-compatible endpoint supported shared request/validation code across short text tasks and vision calls.
- Short structured tasks needed an explicit reasoning/output-budget configuration; schema errors were rejected rather than saved. This is a build observation, not a general model benchmark.
- Vision integration also required correct PDF page rendering and standard fonts. The missing-font defect was ours, not evidence of a provider failure.
- The incorrect historical deadline came from our missing date context and validation. Fixing that boundary is more defensible than claiming a model change alone makes calendar handling reliable.

See STATUS.md, DOCUMENT-STUDY.md and the release audit for observed tests and remaining limits. Do not present synthetic tests as real student research or a guarantee of teaching accuracy.

## October 29 runtime recheck and response-path audit

The deployed inference hostname is api.tokenfactory.nebius.com. The account-visible NVIDIA catalog contains the configured Lightning text model and Super-VL vision model; the small structured-output check passed. A fresh synthetic PDF test passed randomized box-label and arrow-direction checks with Super-VL (755 ms, 1,088 prompt tokens, 17 completion tokens in this observed call). Opted-in synthetic closed-browser daily preparation passed on Lightning (559 ms, 383 prompt tokens, 105 completion tokens), and replay skipped a duplicate run. The daily and backup timers are active. These tests used synthetic data and did not view the student's private PDF.

Fast structured inference already had thinking disabled; the audit verified that boolean without printing credentials. No model switch, new account scope, GPU allocation or additional paid resource was required. Pip now avoids a separate classification call for recognised public technical topics, reuses owner-scoped web searches, removes duplicated prompt content, right-sizes small output budgets and records timing/token metadata without logging prompts or replies. See PERFORMANCE.md for measured scope and limits.

The October 29 rules and organiser judging update were rechecked: runtime NVIDIA-model use on Nebius is the technical baseline; Personal AI is expected to demonstrate persistent context and useful actions, beyond a system-prompt chatbot. Stride's demonstrable workflow is reviewed task/file capture, study/feedback, saved work, a source-backed practice path and opted-in background next-step preparation. It does not claim external email/Drive actions, autonomous code execution, NeMoClaw, OpenShell or Hermes integration. The rules name example personal-AI tools; this app must be described according to what actually runs, not those frameworks' branding.

Remaining submission work is not an implementation pass: record the public demo video under three minutes, finish the Devpost entry and authentic platform feedback, and ensure hosting/inference access remains available through the judging period ending December 15. The project's future credit runway has not been confirmed. Official sources: https://nebiusglobalaihackathon.devpost.com/rules and https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works .

Native response schemas are now supplied to the Nebius endpoint (json_schema, strict), with independent Zod/source validation retained. Synthetic attachment and role-to-practice flows passed on the deployed release. Native-schema vision and daily checks passed in 8.8 seconds and 2.4 seconds respectively; provider/schema warmup varies, so earlier timings above are historical samples. See PERFORMANCE.md for final Pip measurements and limits.
