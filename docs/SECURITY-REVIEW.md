# Security checkpoint — October 27, 2026

This is a bounded application/source and live negative-path review, not an independent penetration test or a guarantee of security.

## Fixed and checked

- **Mutation origins:** all shared data-changing routes now require an explicit allowlisted full origin and matching browser/proxy host. Missing, opaque/null, foreign and HTTP-downgraded origins are refused before state changes or model calls. Previously some routes accepted a missing Origin, and their shared check compared only hostnames.
- **Logout visibility and revocation:** signed-in workspace, Pip and personal setup expose Sign out. The existing account page uses the same exit behaviour. Logout revokes the opaque server account session, clears browser cookies and private handoff drafts, broadcasts exit to other open app views, and reloads restored pages. It does not delete account coursework or chats. Guest logout also revokes the old guest identity while retaining its private record; Continue as guest is a separate action that preserves an existing guest workspace intentionally.
- **Guest expiry:** old guest tokens are rejected server-side after 30 days without a workspace update, rather than relying solely on browser cookie expiry. Expired guests cannot be claimed by a new account. Retained records are not automatically purged.
- **Existing protections rechecked:** server-owned opaque sessions, immediate account-session revocation, refresh/logout race guards, one-time browser-bound OAuth attempts, server-held PKCE verifier, exact HTTPS callback allowlist, account/guest ownership isolation, per-thread versions/retries and public HttpOnly/Secure cookies.
- **Uploads and output:** extraction uses generated temporary paths, extension/magic checks, archive/page/text limits and a time/memory-limited subprocess without the app's secret environment. React escapes chat/code text; retrieved source URLs are restricted to HTTP(S). No unrestricted user-URL fetching or shell interpolation was found in the reviewed request paths. This does not prove a parser sandbox or comprehensive resistance to malicious documents.

## Evidence

- 88 automated tests and the production build passed, including new origin, guest expiry/revocation, sign-out visibility and evidence-preserving introduction tests.
- `node scripts/security-smoke.mjs` passed against public HTTPS: nine POST routes rejected missing/null/foreign/downgraded origins; private environment/database/source paths were not served; logout cleared device cookies. No model calls or real account modifications were used by this script.
- `node scripts/public-smoke.mjs --allow-write` passed HTTPS, cookie, Google/GitHub start/cancellation and callback-origin checks. This is not a new real-provider consent test.
- Production `npm audit --omit=dev` reported **0 known vulnerabilities** at this checkpoint. That result depends on the registry advisory database and is not evidence that every dependency is safe.
- Live storage permissions: data directory 700, SQLite and environment file 600. Encrypted off-volume snapshot restore was checked in the preceding checkpoint. The live SQLite database itself is not application-level encrypted; server tokens require host protection.
- Source-only OpenCode DeepSeek high and GLM low reviews completed. Accepted shared-origin findings and guest-logout ambiguity were checked and fixed. A suggested OAuth-GET flaw required prior planting of an app-host cookie; ordinary OAuth callbacks necessarily use GET, and existing verifier/attempt binding prevents the claimed standalone attack. Cookie-prefix hardening remains a useful follow-up; it is not established evidence of an independent exploit.

## Open items before a wider release

1. **Managed editor HTTP exposure:** the Nebius auth-proxy container publishes host port 8080. An unauthenticated external request redirects to `/login`, where an HTTP password form is reachable. No credentials were submitted. Stride itself is served over HTTPS, but editor ingress should be restricted or served exclusively through a verified HTTPS admin path. Changing the platform-managed proxy requires checking the Nebius console/tunnel dependency first; it was not altered during this app deployment.
2. Consider `__Host-` production cookies with a safe migration and separate local-development names. Existing production cookies are host-only, Secure and HttpOnly; other services on the same host remain a shared trust boundary.
3. Add per-client ingress/upload throttling and a guest retention/cleanup policy. Global inference allowances bound AI spending but do not bound unlimited guest-record creation or parser concurrency.
4. Add a nonce-based Content Security Policy and stronger document-parser isolation before accepting hostile files at scale. Current framing/type/referrer/HTTPS headers do not replace those controls.
5. Complete email recovery, scheduled backups, audience-wide Google testing and independent student/device trials. AI output and prompt-injection resistance need ongoing evaluation even with evidence checks and reviewed writes.
