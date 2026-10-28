# OpenCode helper evaluation

Checked October 25, 2026 on the installed OpenCode 2.0.32 desktop bundle. The CLI is `/Applications/OpenCode.app/Contents/Resources/opencode-cli`; it was not on the shell PATH. No installation or paid provider connection was required.

## What is available

The refreshed installed catalog exposes these free models. Names and availability can change; an earlier cached listing contained two previews that disappeared on refresh.

| Model ID (prefix with `opencode/`) | Installed effort variants |
|---|---|
| deepseek-v4.1-flash-free | low, high, max |
| glm-5.3-flash-free | low, high, max |
| beam-free | low, medium, high, xhigh, max |
| flint-40b-free | low, medium, high, xhigh, max |
| nemotron-3.5-super-vl-free | none, minimal, low, medium, high, xhigh |
| nemotron-3-ultra-free | No selector exposed |
| nemotron-3.5-lightning-free | No selector exposed |
| mimo-v2.6-flash-free | No selector exposed |
| big-pickle | No selector exposed |

No selector does not mean no reasoning. It means the installed catalog exposes no selectable effort variant. Do not invent a `#high` suffix or assume a field recognized by another provider works here. See [OpenCode model variants](https://opencode.ai/v2/docs/models/).

## What was actually tested

- DeepSeek V4.1 Flash: headless response succeeded. Then reviewed storage/HTTP code at explicit `#high`.
- GLM 5.3 Flash: reviewed the same code at provider default. A second review of the backup implementation used explicit `#high`.
- Nemotron Ultra: reviewed the same code at provider default, with no effort suffix.
- All returned substantive answers; available step usage events reported zero cost. This is not a promise of unlimited availability or a billing audit. Other listed models were not quality-tested.

Provisional choice: **DeepSeek `#high` for careful review; GLM `#high` for small test-design/review tasks**. This is a small project-specific trial, not a benchmark establishing the strongest model overall. `max` was not tested; it is not our default because its extra cost in time/context is unproven here.

DeepSeek traced route call sites and noticed the SameSite cookie mitigation when discussing origin handling. Its claim that unrelated field writes necessarily overwrite each other was not established: current mutations read the latest workspace inside the transaction. GLM found the missing destination-directory fsync in the backup tool; that was fixed. Its objection to rejecting unreadable workspace JSON was not accepted: publication intentionally fails if the snapshot cannot restore readable records. Nemotron Ultra proposed a non-constant `ALTER TABLE ... DEFAULT` expression that is unsuitable for SQLite, so its patch was not used. These results show why every suggestion still needs review and tests.

## How to use without exposing local credentials

Create a disposable source-only copy using `git archive HEAD`; it excludes ignored `.env.local`, data, dependencies and build artifacts. Run there, specify an explicit free model, and request a bounded task. This is a clean working copy, **not an OS sandbox**. Never give the helper secrets or permission to inspect unrelated files.

```sh
/Applications/OpenCode.app/Contents/Resources/opencode-cli models --standalone
/Applications/OpenCode.app/Contents/Resources/opencode-cli run --standalone \
  --model 'opencode/deepseek-v4.1-flash-free#high' --format json \
  'Read the specified source files. Review only; do not edit or run shell commands. Give three concrete defects, evidence and a small proposed fix.'
```

Use read-only reviews, test matrices, documentation drafts and small isolated patches. Give one file/task at a time; inspect diffs and run the actual checks before applying changes. Do not enable automatic approval for broad shell access. The four trial tasks used only public source and synthetic data. No live API key or private student content was supplied.

Free model requests go to external services. Their retention/training policies differ. OpenCode currently documents zero retention/no training for DeepSeek and GLM free providers; NVIDIA free endpoints are trial use and exclude confidential/personal inputs. Free availability is temporary and rate-limited. See [current free-model pricing and privacy](https://opencode.ai/v2/docs/console/models/).

OpenCode helper inference does not draw from Codex's model allowance, but this supervising conversation still does. Savings depend on keeping tasks narrow and reading concise results. Stride's student-facing runtime continues using NVIDIA through Nebius Token Factory; helper models do not replace that integration.

## 28 October release work

OpenCode free GLM implemented a reviewed button-style patch in a disposable source copy. DeepSeek free implemented full encrypted database/PDF backup and recovery tests; independent validation caught and fixed a large-base64 validator failure. Three further free DeepSeek/GLM audits reviewed AI behavior, user flows and operations. A final DeepSeek review examines settings merging and transport recovery. Static findings are not production evidence; RELEASE-AUDIT.md records accepted fixes and practical limits.

KiroCrew's installed adapter was inspected and is Codex-backed here. It therefore does not provide a separate free inference allowance. Heavy follow-up review work goes to OpenCode instead. No private keys, student PDF content or account workspace records were intentionally included in helper tasks.
