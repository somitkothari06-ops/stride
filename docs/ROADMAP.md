# What is complete and what remains

Updated October 25, 2026. This is a development checkpoint, not a finished hackathon submission. No percentage-complete estimate is claimed.

## Working and checked

- The app runs on the existing Nebius Devlab and has public GitHub source with automated checks.
- Today, My work, Memory and Direction have responsive interfaces.
- Text intake can extract candidates, let the student confirm details and save work.
- Confirmed deadlines and availability influence planning; changed context makes previous plans stale.
- Live NVIDIA Nemotron inference works for extraction, planning, practice preparation and labeled model feedback.
- Attempts and sources are remembered; editing/removing records changes future context. Data can be exported.
- Separate opaque browser sessions keep their workspace records separate; storage survives normal page reloads.
- Live-request status is stored against the exact provider configuration. Presence of a key is distinguished from a successful live response.
- The production build and automated tests pass. A synthetic live integration flow has passed.

## Incomplete

| Work | Current state | Completion evidence needed |
|---|---|---|
| Live internship grounding | Tavily adapter/interface exist; no configured key or real search verification | Valid account access, real relevant sources, eligibility/freshness handling, observed work linked honestly |
| Cross-device user accounts | Browser-cookie sessions only | Managed sign-in, shared identity across devices, account recovery and two-user authorization checks |
| Automatic daily preparation | Not implemented | Authenticated scheduled job, opt-in, idempotent runs, freshness display and an observed closed-browser run |
| Public judge access | Development SSH tunnel only | Stable HTTPS URL usable from a fresh independent browser, isolated demo, documented access and hosting runway |
| Broad file intake | Pasted text only | Tested supported screenshot/document path with clear limits and source preservation, if included |
| Executed practice checks | Authored guided prompts/model feedback only | Optional constrained runner with reviewed fixtures and explicit execution conditions; never claim tests ran before this exists |
| Production data operations | Transactional SQLite JSON per browser session | Versioned migrations, backup/restore, retention/deletion semantics, request idempotency and supervision suitable for the chosen deployment |
| Product/model quality | Representative synthetic checks only | Unfamiliar real student tasks, adversarial/ambiguous cases, useful feedback, measured quality/latency/cost and fixes |
| Accessibility and polish | Initial responsive interface | Focus/keyboard/mobile review, robust empty/error/loading paths and final complete-flow review |
| Submission package | Initial README/license/source exist | Final demonstrated scope, judge instructions, authentic tool feedback, short public video and completed Devpost entry |

## Suggested next work order

1. Finish the live direction/role-grounding path once Tavily access is available. Use a small real sample and keep academic constraints in control.
2. Select and configure managed account identity; migrate browser-only assumptions without exposing existing records.
3. Implement scheduled daily preparation with persistent state and safe retries.
4. Establish public judge access and evaluation-period hosting before treating a development tunnel as deployment.
5. Complete failure recovery, data operations and meaningful student/model trials.
6. Freeze a demonstrable stable version, rehearse the video and finish the submission package.

These are team tasks. They have not automatically been assigned to the friend, and the current checkpoint does not mean either builder's entire role is complete. Coordinate file ownership before working in parallel.
