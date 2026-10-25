# First development milestone

Implemented: assignment intake/confirmation, Today planning, authored guided practice, attempt records, source-aware memory controls, live-provider adapters, role-source interface and browser-session persistence.

Validation on the Nebius Devlab:

- TypeScript check.
- Sixteen planner/storage/provider-configuration/connection-status tests covering ambiguous/invalid dates, urgent replanning, time bounds, no-history/no-goal flow, calendar timezone, independent sessions, transaction rollback and call allowance.
- Production build.
- HTTP smoke flow for persistence, separate sessions, preparation/attempts, dependent-record removal and cross-origin rejection.
- Browser check: prepared a SQL session, saved a synthetic explanation as self-report, confirmed an urgent exam notice, refreshed the stale plan, and verified the recommendation switched to exam revision.

Live integration update, October 25, 2026:

- A dedicated Token Factory key was configured privately on the Devlab. No credential is stored in this repository.
- The account-visible `nvidia/Nemotron-3_5-Lightning` model passed a small structured-output connection test.
- Reasoning was explicitly disabled for short structured tasks after an initial output-limit failure.
- Planner prompts were made explicit about JSON field types after validation caught a string where an array was expected. Invalid output was rejected rather than saved.
- Live synthetic workflow passed: extraction (495 ms), source-linked planning (538 ms), practice preparation (872 ms), and labeled model assessment (451 ms). These are single-run observations, not latency guarantees or benchmarks.
- Tavily is not configured. No live role-search quality is claimed.

These checks do not establish model correctness across coursework, educational efficacy, production authentication or a public submission deployment. All test coursework is synthetic.

Connection status fix:

- Replaced the hardcoded “still needs verification” sentence with persisted successful-response metadata.
- Verification resets when the key, model, endpoint or reasoning configuration changes; a later failure does not erase the last-success timestamp.
- The student settings view now explains service availability without exposing environment-variable instructions.
- See [the completion checklist](ROADMAP.md) for the unfinished project scope.
