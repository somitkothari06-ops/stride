# Stride accounts

Optional Supabase identity opens the same workspace across devices connected to the same Stride backend. Coursework remains in the existing persistent SQLite database; it has not moved to Supabase Postgres. Guest mode requires no account.

## Google and GitHub

The login page offers both providers. Enabled status comes from Supabase's public Auth settings, not hardcoded success flags. Disabled providers are labelled **Setup needed** and cannot start a broken flow. The same buttons handle signup and sign-in; account identity and linking are handled by Supabase, never by matching unverified email text in Stride.

The app starts a server-held S256 PKCE flow with a 10-minute opaque browser cookie. The one-time attempt is bound to its origin and its initial guest/account cookies. Provider access tokens are not returned to browser JavaScript or stored as GitHub API credentials. Callback exchange verifies the Supabase identity and uses the existing account/guest-claim rules. Attempts are claimed atomically to prevent replay, retained during exchange so logout can cancel them, then removed before account-session creation. Cancellation, expired links and mismatched browsers return safely to login without changing the workspace.

For credential setup and exact callback URLs, see [OAuth provider setup](OAUTH-SETUP.md). A successful authorize redirect is not evidence that provider consent and callback login completed; verify the complete flow with a real account.

## Flow and ownership

1. Open `/login` or choose **Save my workspace** in the workspace navigation.
2. Create an email/password account, confirm its email, then sign in. First sign-in claims the current guest workspace only if the account has no saved workspace. The storage identity rotates, invalidating old guest requests and outstanding import reviews. Finish or repeat document review after sign-in.
3. Existing accounts open their existing workspace. Guest work is never automatically merged. Export guest material before switching to an existing account if you need to retain it.
4. Sign out on this device to revoke its opaque account session immediately and clear its workspace cookies. Other signed-in devices remain active. A new guest workspace is separate from the saved account.

The browser receives a random HttpOnly, SameSite=Lax cookie, not provider access/refresh credentials. SQLite stores a hash of that cookie, provider credentials and a 30-day absolute device expiry. Every account request checks the user with Supabase. Provider tokens refresh through one operation per device within this single app process. Logout deletes the local device session, including its provider credentials. It does not sign out other devices or call global Supabase logout. The application uses no service-role key in request paths.

## Configuration and deployment

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored environment file. The names follow Supabase's convention; this implementation consumes them only on the server. Never configure a service-role/admin key there. For public deployment, pin `STRIDE_PUBLIC_ORIGIN` to the HTTPS origin. Optional additional origins must be explicitly listed in `STRIDE_AUTH_ADDITIONAL_ORIGINS`; no wildcard host is accepted. With no public origin configured, only the documented localhost/127.0.0.1 preview ports are allowed. This prevents the internal Next.js listen address or an arbitrary forwarded host from becoming an OAuth redirect.

The official CLI is linked to the existing Stride project. Run `supabase config diff` before `supabase config push`; the sparse committed configuration declares only preview redirect URLs and required email confirmation. Do not replace it with generated defaults and push those defaults to the hosted project.

Before public launch:

- Set a stable public HTTPS origin and its login redirect URL in Supabase, then verify Secure cookie behavior behind the final proxy. A loopback SSH tunnel is not public cross-device hosting.
- Configure custom SMTP for confirmation email. Supabase's built-in sender only delivers to project-team addresses, with low limits. Keep confirmation enabled. See [official SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp).
- Add and verify account/password recovery. That UI is not implemented yet.
- Harden public traffic abuse controls and evaluate representative real-user flows. Current request limits are shared across the single backend; they are not a distributed abuse-control service.

## Verification

`npm run check` covers one-time claims, owner separation, stale guest writes, expiry, revocation and persistent request limits. The synthetic live test is an explicit opt-in:

```sh
node scripts/account-smoke.mjs --allow-live
```

Supply `NEXT_PUBLIC_SUPABASE_URL` and a temporary `STRIDE_TEST_SUPABASE_ADMIN_KEY` only to that process. It creates two synthetic users with confirmation already satisfied, sends no email, exercises account behavior and deletes those test users in `finally`. It never verifies actual email delivery. `STRIDE_TEST_IDS_FILE` privately records test user IDs for local synthetic workspace cleanup. Optional `STRIDE_TEST_SSH_HOST` and `STRIDE_TEST_SSH_KEY` enable a forced-expiry/concurrent-refresh test on the documented Devlab; do not use it against unrelated deployments. Admin credentials must never be saved to the app or printed.

Back up before changing schema. Snapshots now contain device-session credentials; follow [recovery guidance](RECOVERY.md). Do not roll back to ownership-unaware code against an account-enabled database.
