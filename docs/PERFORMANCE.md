# Responsiveness audit — 29 October 2026

OpenCode reviewed the source-only Pip/Nebius pipeline. Its concrete findings were independently checked: a search turn made a query-classification model call, a web request and a reply model call in sequence; the prompt repeated passages in both workspace.sources and availableSources; the latest message also appeared twice; Pip startup always bootstrapped before loading the chat.

## Changes

- Recognised technical topics get a query constructed only from fixed public labels and recognised technical qualifiers, never student names/private copied text. They skip the classifier call. Unknown/current queries retain a bounded classifier rather than copying arbitrary student text to the search API.
- Pip search results are cached in process for five minutes (one minute for time-sensitive queries), by workspace and exact query. Concurrent identical requests share one search. Failed calls are not cached, output is cloned, and the cache holds at most 128 entries. Original retrieval timestamps remain intact. This does not make a claim that cached sources are newly retrieved.
- Sources and the latest message are each sent once. Page scoring lowercases a page once rather than for every matched term. Conversation history and source checks remain intact.
- Search/title classification budgets are reduced to 256 tokens, with a five-second deadline. Normal Pip replies use 1,800 tokens and a 20-second deadline. Model output and source references are still checked before commit. This is not fabricated text streaming.
- Existing Pip sessions need one load request. Guest bootstrap occurs only for SESSION_EXPIRED, never for unrelated authentication failures. Pending user messages appear immediately; failed requests retain the original draft.
- Inference logs contain model, duration and token counts only, not prompts, replies, private document text or credentials. Pip replies expose aggregate Server-Timing stages for diagnosis.
- Course discovery is MIT-only at both the UI and reference-validation boundary. Known DSA, OS and database choices use curated MIT pages directly, without a search. Other subjects search MIT OpenCourseWare and non-MIT results are refused. The database reference is MIT 6.830 (Fall 2010), labelled with its actual year.

## Limits

Fresh web retrieval, model reasoning, document parsing and vision still take real time. No instant-response or zero-outage promise is made. Search cache entries are temporary and owner-scoped; no private source passages are put into public fast-path queries. This work does not add unlimited context or proof of learning.

## Verification

The benchmark uses three synthetic messages against the public HTTPS application, from the same Nebius host before and after the change. It is a small operational sample, not a population-level latency benchmark or the student's browser-to-cloud round trip. See the measured release notes below. Correctness tests cover cache expiry, failures, in-flight deduplication, owner isolation, immutable returned data, MIT domain boundaries, preserved current-message order and guest/auth load behavior.

### Measured release sample

| Synthetic request | Before | After |
|---|---:|---:|
| Short personal conversation | 528 ms | 403 ms |
| Fresh SQL teaching + web search | 2,998 ms | 827 ms |
| Same-topic teaching follow-up | 2,513 ms | 616 ms |

The follow-up search stage measured 0.2 ms after caching, with genuine source citations retained. Differences include provider/network variability; these three samples do not establish a general percentile or guarantee. Known MIT DSA/OS/database selections returned in 27/9/8 ms respectively in the server-side public-HTTPS check, with no search or inference call. Browser-to-server latency is additional.

214 automated tests, TypeScript and the release build passed. The explicit classifier path remains for requests outside the supported fast topics; failed searches still surface honestly. Cache data is not shared across workspaces. No model output is displayed as a completed answer before source checks and the chat commit succeed.

### Native schema reliability

Nebius now receives the actual response schema, in addition to server-side Zod and source checks. A JSON-only follow-up returned wrong field types during the audit; native schema output resolves that reproduced failure. This does not guarantee factual correctness. The final sample above uses the native-schema release; fresh retrieval measured 96 ms in that sample, so its improvement also includes search/provider variability. First-use schema/provider overhead can be higher: synthetic vision took 8.8 seconds and daily preparation 2.4 seconds in the native checks. Both passed, and duplicate daily preparation was skipped. Attachment capture and source-backed role-to-practice checks also passed.
