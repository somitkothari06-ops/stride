# Stride

**[MIT licensed](LICENSE)** · NVIDIA × Nebius Hackathon · Personal AI

Your notes. Your ideas. Your next move.

A personal desktop for second- and third-year CS/engineering students: learn from college files, turn a concept into a chosen project, try code, keep the work and return to a useful next step.

- **[Live application](https://stride-213-239-171-145.sslip.io/)**
- **[Isolated judge demo](https://stride-213-239-171-145.sslip.io/demo)** — Riya's illustrative month, with 20 sample study sessions, project files, chats and a build. Each visitor gets a separate copy. Sample history is not real login telemetry or verified achievement.
- **[NVIDIA × Nebius runtime evidence](docs/NVIDIA-NEBIUS.md)**
- **[Implementation status and limits](docs/STATUS.md)**

## For judges

1. Open the [judge demo](https://stride-213-239-171-145.sslip.io/demo) and choose **Step into Riya’s workspace**. No account or shared password is required.
2. Open **Coursework**, **My Build** and **Pip** from the dock. Run the JavaScript example or save an attempt and request feedback.
3. Ask Pip: **What project did I choose a month ago, and what was the unresolved question in that first saved thought?** Inspect the dated source it uses.
4. Open **Journal → My progress** for the sample month and downloadable artifacts. Use Settings to personalise the desktop.

New AI requests use the connected services. The preloaded history and conversations are labelled samples. Leaving the demo restores your previous workspace. Private college files used during testing are not bundled into a new judge copy; upload your own file to test document reading.

## What works

- Independent desktop windows: open several tools together, drag, resize, arrange, minimise and reopen while keeping drafts.
- Import PDF, PPTX, DOCX, TXT and MD course material. Review extracted text before saving it. Study selected PDF pages with text and page images, worked examples, questions and formative feedback.
- Review extracted assignments and deadlines before saving. Calendar arithmetic uses an explicit date and timezone.
- **My Build** connects coursework to a project the student chooses. Write notes or code, run JavaScript in an isolated browser worker, keep attempts and request feedback and a next step. Other language text can be saved; it is not executed as JavaScript.
- **Pip** supports separate chats, useful titles, relevant dated memory retrieval, public web resources and reviewed saving of thoughts/coursework. Chat receives extracted text; visual PDF reading happens in the study tool.
- **Journal** stores session notes and reviewed text/image evidence. Uploaded artifacts and AI feedback do not prove authorship or mastery.
- Theme and desktop customisation, data export, optional account sign-in and optional scheduled next-step preparation.

No ERP, Gmail or Drive synchronization is claimed. Voice uses browser dictation and has a typed fallback.

## NVIDIA and Nebius

| Service | Actual role |
|---|---|
| `nvidia/Nemotron-3_5-Lightning` through Nebius Token Factory | Pip, intake, planning, practice, structured feedback and context synthesis |
| `nvidia/Nemotron-3.5-Super-VL` through Nebius Token Factory | Selected PDF-page images alongside extracted text |
| Nebius CPU Devlab | Next.js application, private SQLite storage, retained files and background preparation |
| Tavily | Public source retrieval; AI synthesis is a separate step |

The Devlab has no GPU. Models are hosted by Token Factory; we do not train or self-host them. Source IDs, request validation, owner-scoped storage and bounded memory retrieval surround the inference calls. Model interpretation can still be wrong.

## Run locally

Use **Node 22.13+**. `node:sqlite` is experimental on Node 22.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js. `/workspace` starts a guest workspace; `/demo` creates a separate sample copy. Leaving demo restores the original workspace.

Edit `.env.local` privately to connect services:

- `NEBIUS_API_KEY`: Token Factory key.
- `NEBIUS_BASE_URL`: defaults to `https://api.tokenfactory.nebius.com/v1`.
- `NEBIUS_MODEL_FAST`: eligible text model ID above.
- `NEBIUS_MODEL_VISION`: eligible vision model ID above.
- `NEBIUS_DISABLE_THINKING=true`: tested direct-output configuration for the Lightning endpoint.
- `TAVILY_API_KEY`: optional web retrieval.
- Supabase account settings are documented in [ACCOUNTS.md](docs/ACCOUNTS.md). Guest demo access does not require social sign-in.

Restart after environment changes. Without connected models, local guidance is labelled; it is not silently presented as live AI.

```sh
npm run check
npm run build
npm run start
```

Persistent state defaults to `.data/stride.sqlite`; set `STRIDE_DATA_DIR` to persistent storage in deployment. Never commit environment files, databases, backups or private course files. [Deployment](docs/DEPLOYMENT.md) and [recovery](docs/RECOVERY.md) describe the managed service and backups.

## Validation and limits

The submission release passes typecheck, **247 tests on deployed Node 22**, and a production build. Browser checks cover desktop windows, settings persistence, landing code execution, live AI explanation and authentic college PDF/slide imports. Demo smoke checks verify isolated histories, downloadable attachments, foreign-owner rejection and preservation of the original workspace.

```sh
STRIDE_BASE_URL=http://localhost:3000 node scripts/demo-smoke.mjs
```

These checks establish tested workflows, not universal correctness or learning efficacy. Long-term recall uses bounded lexical/topic retrieval, not every old word in every request. PDF lessons use selected page ranges; diagrams can be misread. SQL/Python/C are not executed by the browser JavaScript runner. Public capacity and hosting-credit runway need monitoring through judging. Social sign-in does not grant email or Drive scopes.

## Platform feedback

Token Factory’s OpenAI-compatible endpoint and structured responses supported shared validation code across text workflows. The separate NVIDIA vision model let us combine selected PDF-page images with extracted text. Explicit output budgets and direct-answer configuration mattered for short tasks. Date resolution, source checks and PDF rendering still needed application-side validation. A CPU Devlab was sufficient to host the app because inference ran on Token Factory. More predictable cold/warm latency and clearer per-model schema/capability guidance would help future development. These are observations from this project, not a general model benchmark.

## License

[MIT](LICENSE). Third-party software and model services retain their respective terms. Private college material is not bundled in this repository or the public sample fixture.
