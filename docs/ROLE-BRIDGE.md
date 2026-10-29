# From role search to a practical path

Direction returns public web pages first, then asks the configured NVIDIA model through Nebius for a three-step exploration path. The first step fits today's saved time; later steps extend a small project and explain/show the result. Every step has a concrete deliverable and opens Pip with the actual task, starting point and supporting excerpts.

The model sees a bounded selection of literal source excerpts, recent visible study attempts and Journal entries, coursework topic titles, and self-reported profile context. An empty history is a valid starting point. Coursework titles and artifacts do not establish competence or authorship. The path is an exploration suggestion, not a job-readiness score or qualification guarantee.

OpenCode drafted the pure context/schema/reference-validation module and its synthetic tests in a source-only copy. Supervising integration added Journal artifact visibility, coursework topics, derived-path invalidation on Journal saves/deletions, ownership checks, cached-source reuse, retry UI, and the step cards/Pip handoff.

References are supplied as IDs; generated IDs must resolve to the same prompt's source facts and visible records. Source excerpts are exact substrings. This checks reference integrity, not the semantic truth of every model interpretation; each step exposes its supporting excerpts for inspection. Removed records cannot be reused. The complete context fingerprint and workspace revision protect an in-flight response from overwriting newer context.

Only successful paths are replay-cached. Changed learner context rebuilds the path while reusing recent pages. A failed model response leaves the pages available and an explicit Build my path action. It does not claim to have generated a path. There are no fabricated steps presented as model output.

Live testing exposed overly strict prose limits. The prompt still requests concise wording, while larger bounded safety limits accept a modestly longer useful explanation intact. Nothing is truncated into an incomplete instruction to manufacture success.

# Daily settings recovery

Daily preparation uses a versioned, non-replay-safe PUT. Its client retries reads once after a transport failure. After an uncertain save it reads the server's confirmed setting; it reports success only if the requested values and a newer version are present. Otherwise it shows confirmed values and a reload action. It never blindly resubmits the PUT. Persistent outages and concurrent edits remain visible rather than being hidden as success.

The provider's harmless extra fields are stripped before the strict saved contract is validated; invented URLs in those fields are never used. Null/absent optional record references become empty arrays, while nonempty unknown record/fact references remain rejected. Internal fact/journal identifier tokens are removed from generated student-facing prose, not from citation metadata.

Verification: TypeScript, 198 automated tests and the production build passed. The live Cybersecurity API check required real successful paths for both empty history and a relevant synthetic Journal record; a links-only fallback was explicitly a test failure. It checked exact source excerpts, use of the relevant Journal record, reuse of cached pages after new work, persisted reload, duplicate-safe successful replay, refusal of another workspace's search ID, and clearing derived claims after deleting the record. Visual checks covered the step accordion, supporting quotations and the readable theme-aware cards. Separate mocked daily-client tests cover a lost save response, unchanged saves, concurrent settings, read retry and persistent outage without duplicate PUTs. Workspace, Journal and Pip startup reads also use the existing bounded transport retry, and a recovered workspace load clears its stale error banner.
