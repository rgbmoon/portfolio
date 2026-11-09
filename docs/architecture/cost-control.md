# 6.2 Cost control

1. Choose services with a fixed price or a hard spending cap.
2. Route every call to a paid external service through an application quota (per user, per IP, total daily) and a
   circuit breaker that disables the feature when the ceiling is reached. Keep the total daily email limit below the
   provider limit.
3. Limit request rates: `@nestjs/throttler` (in-memory) and the Better Auth limiter (DB storage).
4. Put Cloudflare Turnstile on sign-up, sign-in, password reset, publication creation and forms that send emails.
5. Do not create public write endpoints without authentication. The only exception is anonymous telemetry collection
   (Web Vitals metrics). It requires:
   - a hard rate limit per IP;
   - a request size limit;
   - schema validation;
   - sampling;
   - no cookies or identifiers; IP is not stored;
   - aggregation and limited retention of raw data.
6. Limit the request body size, WS message size and the number of connections.
7. Apply the rules of section 5.8 to any user content: quotas, global ceilings, trust levels, sanctions.
8. Enable spending alerts on every account with a linked card. R2 has no hard spending cap, so quotas and a global
   storage ceiling are mandatory.
