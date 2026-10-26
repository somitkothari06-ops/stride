# Google and GitHub sign-in setup

GitHub is enabled in the current Supabase project. Google still needs OAuth app credentials. Both application flows are implemented; do not claim real consent/callback success until that provider has been tested with a real account.

## Two callback URLs with different purposes

| Where | URL |
|---|---|
| OAuth app registration in Google/GitHub: provider returns to Supabase | `https://oattrbamqsdhiswvmrvx.supabase.co/auth/v1/callback` |
| Supabase allowed redirect: Supabase returns to Stride | `http://127.0.0.1:3100/api/account/oauth/callback` |
| Additional localhost preview alias | `http://localhost:3100/api/account/oauth/callback` |

The application homepage during development is `http://127.0.0.1:3100`. These loopback URLs require the existing SSH preview tunnel on the user's machine. They are not public hosting. Set a stable public HTTPS origin before judge access, update Supabase's redirect allowlist and provider homepage/origins, then pin `STRIDE_PUBLIC_ORIGIN`. The provider-to-Supabase callback above stays the same for this project.

## GitHub

1. Open [Register an OAuth app](https://github.com/settings/applications/new) in the signed-in GitHub account.
2. Name it **Stride**, use the preview homepage and the provider-to-Supabase callback above. Leave wildcard matching and device flow disabled; keep access-token expiry enabled.
3. Register the application and generate a client secret. Save its Client ID and secret privately to `.env.oauth.local`, in `STRIDE_GITHUB_CLIENT_ID` and `STRIDE_GITHUB_CLIENT_SECRET`.
4. From the repository, run `node scripts/configure-oauth.mjs` to check field presence, then `node scripts/configure-oauth.mjs --apply` to enable only the supplied providers in the linked Supabase project.
5. Open `/login`, choose **Continue with GitHub**, approve the identity/email consent and verify the return to `/workspace`. No repository-access scope is requested by Stride.

## Google

1. Open the [Google Auth Platform clients page](https://console.cloud.google.com/auth/clients), select or create the intended project, and complete its branding/audience/contact setup.
2. Create an OAuth client of type **Web application**. Add the app origin under authorized JavaScript origins and the provider-to-Supabase callback under authorized redirect URIs.
3. If the OAuth audience is in **Testing**, add intended testers; move to the appropriate published audience before wider signup. Do not claim unrestricted access while Google's testing restrictions still apply.
4. Save the generated Client ID and secret in `STRIDE_GOOGLE_CLIENT_ID` and `STRIDE_GOOGLE_CLIENT_SECRET` in `.env.oauth.local`. Apply with the same local setup script.
5. Verify Google's consent screen and the complete return to Stride. Only basic identity/email/profile is used; no Gmail or Drive access is requested by this flow.

The private credential file is ignored by Git, mode 600 and not part of Stride's runtime environment. The helper sends its secrets only to the linked Supabase Auth configuration through the CLI. Its output suppresses provider credentials. Do not send this file to OpenCode, copy it to the Devlab app or share it in chat/screenshots. Supabase keeps the provider secrets; Stride needs only its public client configuration.

## Checks

- `npm run check` covers PKCE challenge generation, SDK verifier encoding/exchange, one-time attempts, cookie/origin mismatch refusal, expiry and cancellation during exchange.
- `node scripts/oauth-smoke.mjs` checks provider readiness, disabled-provider refusal, cross-origin refusal and safe failure redirects without paid model calls or provider consent. It does not prove a successful provider login.
- A real provider login should reopen the same owned workspace on another device. Cancelling consent should leave existing work intact. Signing out must revoke the Stride device session and cancel any pending provider attempt.

Official references: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Supabase GitHub setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-github), [PKCE OAuth method](https://supabase.com/docs/reference/javascript/auth-signinwithoauth).
