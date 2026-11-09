# 5.7 Authentication

- Better Auth runs inside the app; data is stored in our DB.
- Sign-in methods: email and password with email verification, Google (OAuth 2.0 / OIDC with PKCE), passkeys. Magic
  link or one-time code and TOTP 2FA — decided in iteration 6.
- The primary session record is in the DB. This gives instant revocation and a device list. `secondaryStorage` (Redis)
  can be added later without schema changes.
- Cookie cache with the `jwt` strategy: a short-lived (about 5 minutes) signed JWT in an httpOnly cookie, verified
  without a DB call. The 5-minute window is recorded in an ADR.
- Sensitive operations (password and email change, account deletion, passkey management, moderation actions) check
  the session in the DB, bypassing the cache.
- JWT plugin with JWKS (`sessionCookieCache: true`) — for WebSocket and future services. Set explicitly:
  `jwks.rotationInterval` (for example 30 days), `gracePeriod` (no shorter than the token lifetime plus the JWKS
  cache), `issuer`, `audience` and a short `expirationTime`. Without `rotationInterval` some versions created a key on
  every request.
- Tokens are never stored in localStorage and are not accessible to JavaScript.
- Frontend and API run on subdomains of one domain. Cookies: `Secure`, `HttpOnly`, `SameSite=Lax`. `SameSite=Lax` does
  not protect against requests from sibling subdomains, so active user content is never served from subdomains
  (section 5.11).
- `trustedOrigins` — an exact list without wildcards.
- Better Auth rate limit: `storage: "database"` and `customRules` for `/sign-in/email`, `/sign-up/email`,
  `/forget-password`, `/send-verification-email`. The real client IP comes via `advanced.ipAddress` with one trusted
  header (section 6.7).
- Protection against brute force and enumeration: the same response for "no such user" and "wrong password",
  Turnstile on sign-up and password reset, lockout per account in addition to per IP.
- Linking a Google account to an email account requires a verified email on both; otherwise account takeover is
  possible.
- Passkeys are bound to the `rpID`: the domain is fixed before launch; changing the domain invalidates them.
- Nest integration: `@thallesp/nestjs-better-auth` requires `bodyParser: false`, so the `json`/`urlencoded` limits and
  `rawBody` are set in `AuthModule.forRoot({ bodyParser })`. The global `AuthGuard` stays enabled: deny by default,
  public routes are marked explicitly. Alternative — an own guard; decided in iteration 6.
- Account deletion — `deleteUser` with re-authentication and a cascade via the `user.deleted` event. Data export — a
  JSON archive produced by a pg-boss job.
