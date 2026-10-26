# Stride

A personal workspace for second- and third-year CS/engineering students: decide what to do next, work through a focused exercise, and keep an honest record of progress.

**Status: first working development milestone.** The app runs on an existing Nebius Devlab. Live NVIDIA inference is configured and verified on the team Devlab; other checkouts need their own private key. Tavily live source retrieval is configured and verified on the team Devlab. AI comparison can fall back to clearly labelled source-only results. This is not yet the final submission or a public production service.

## Working in this milestone

- A Signal-style landing page at `/`, optional personal-story setup at `/about-you`, and the study app at `/workspace`.
- Personal context covers experience, interests, uncertainty, ambitions, constraints and learning preferences. A career goal is optional.
- Course library: review and confirm extracted PDF/PPTX/DOCX/TXT/MD text, reference relevant excerpts in practice, and compare with curated public-course summaries. See [formats and limits](docs/COURSE-CONTEXT.md).
- Five independent visual studies at `/design-lab/index.html`; the user selected Signal for the working app.
- Four responsive views: Today, My work, Memory, Direction.
- Paste a notice or project excerpt, review extracted candidate fields, confirm a date, and save work.
- Plans respect confirmed deadlines and available time; changed context marks old plans stale.
- Prepare guided practice, submit an explanation, and record an observation.
- Edit work, complete/reopen it, remove sources and dependent observations, and export the workspace.
- Persistent SQLite storage on the Devlab, with independent guest sessions and optional Supabase accounts.
- Server-side Nebius and Tavily adapters, schema validation, timeouts and live-call allowances.
- Explicit distinctions between sample data, rule-based guidance, self-report and model assessment.

No ERP integration. No automatic Gmail/WhatsApp access. Source selection records where pasted material came from; it does not imply synchronization.

## Run locally

Use Node **22.13+** (tested on 22.23.4). The app uses the built-in experimental `node:sqlite` API; an experimental warning is expected on Node 22.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js (normally port 3000). You can try the clearly labeled sample workspace at `/workspace` with no keys. `Start fresh` clears the disposable records in the current browser session. Keep private student material out of shared/demo sessions.

For a production build:

```sh
npm run check
npm run build
npm run start
```

Persistent data defaults to `.data/stride.sqlite`. Set `STRIDE_DATA_DIR` to a persistent directory when deploying. Keep the database, WAL files, logs and environment files out of Git. The current schema is initialized once with `CREATE TABLE IF NOT EXISTS`; future schema changes need versioned migrations.

## Connect NVIDIA inference through Nebius

Edit `.env.local` privately:

- `NEBIUS_API_KEY`: an actual Token Factory key, not a promo code.
- `NEBIUS_BASE_URL`: the provider's OpenAI-compatible base URL; default is `https://api.tokenfactory.nebius.com/v1`.
- `NEBIUS_MODEL_FAST`: an exact account-visible NVIDIA model ID. Tested: `nvidia/Nemotron-3_5-Lightning`.
- `NEBIUS_DISABLE_THINKING=true`: tested for short structured tasks on this Lightning endpoint. This requests direct answers instead of using the output budget for reasoning. Recheck support when changing models.

List available eligible models without running inference:

```sh
node --env-file=.env.local scripts/check-provider.mjs
```

After choosing a model, run one small paid structured-output check:

```sh
node --env-file=.env.local scripts/check-provider.mjs --test
```

Restart the app after environment changes. Then test extraction, preparation and explanation feedback with the real model. The connection view distinguishes configuration from a validated live response and shows its timestamp. A changed key/model/configuration resets verification, and later failures are shown separately. Provider errors preserve stored work and do not silently relabel rule-based content as AI output.

Without a key/model, local guidance uses simple explicit rules and authored practice prompts. Attempts are recorded as **self-report**, without correctness claims. No code/test execution is claimed by this milestone.

## Connect live role sources

Set `TAVILY_API_KEY` server-side and restart the managed app service; see [deployment and health checks](docs/DEPLOYMENT.md). Direction retrieves a small public sample with URLs and retrieval times. If Nebius is also configured, it produces a bounded comparison linked to observation IDs. Inspect seniority, eligibility and freshness yourself; a search hit is not proof an opening remains available. Without Tavily, the app clearly shows setup is needed instead of invented job results.

## Validation

```sh
npm run typecheck
npm test
npm run build
```

Against a running disposable instance:

```sh
node scripts/smoke.mjs
```

The smoke script creates separate synthetic sessions, exercises persistence, planning, preparation and an attempt, checks deletion invalidation, and tests origin protection. It can invoke live providers if configured: use a keyless test instance for a no-cost local-guidance check. Override the target with `STRIDE_TEST_URL`.

Explicitly opt into a small paid synthetic workflow against a configured running instance:

```sh
node scripts/live-smoke.mjs --allow-live
```

This runs four live calls and checks extraction, plan constraints/source references, practice preparation, and the model-assessment label. It checks integration behavior, not educational efficacy.

See [development notes](docs/DEVELOPMENT.md), [milestone status](docs/STATUS.md), and [what remains](docs/ROADMAP.md).

## Architecture and privacy boundary

Next.js/React frontend and Node server routes → schema validation → session-scoped workspace → SQLite. Optional provider adapters call Nebius and Tavily only on the server. An HttpOnly SameSite session cookie contains a random token; the database stores its SHA-256 hash. Clients do not select arbitrary workspace owners. Origin checks protect browser mutations, and writes are transactional.

Guest workspaces use opaque browser cookies: losing a guest cookie loses access to that workspace. Optional Supabase email/password login maps a verified identity to one account workspace across devices on the same Stride server. First sign-in claims the current guest workspace only when the account has no existing workspace; it never merges into an existing account. See [account setup and limits](docs/ACCOUNTS.md). SQLite is not an encrypted vault. Content deletion removes it from active workspace context, but does not claim forensic erasure from WAL files/backups. Export user-owned data before abandoning a session.

The server is currently reached through an SSH tunnel. Before public launch, finish email delivery and account recovery, HTTPS/proxy hardening, durable migrations/backups, retention controls and stronger public traffic limits. Process supervision is configured. Synthetic two-user login and isolation are checked; representative real-user testing remains.

## Remaining submission work

- Configure and verify Tavily; broaden model quality evaluations. NVIDIA/Nebius extraction, planning, preparation and model assessment have passed a synthetic live workflow.
- Configure production email delivery, password recovery and isolated judge access for the implemented account flow.
- Add safe scheduled brief preparation, source provenance improvements and duplicate/update handling.
- Harden request idempotency, large-input handling, modal accessibility and model quality evaluations.
- Validate any optional image intake or constrained SQL execution separately.
- Verify public deployment, stable data and evaluation-period hosting runway.
- Test with classmates; record actual tool feedback; prepare the final demo video and Devpost materials.

Do not present this development checkpoint as a finished hackathon entry. The source is MIT licensed; never publish keys, local databases, private SSH material or real student records.
