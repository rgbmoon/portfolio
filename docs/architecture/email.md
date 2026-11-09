# 5.12 Email

- Sending goes through an `EmailProvider` interface: locally to Mailpit, in production to Resend.
- Emails are sent only by a pg-boss job, never synchronously in a request handler.
- Templates — React Email or MJML, localized `ru`/`en`.
- Table `email_log` (without the email body).
- Resend free plan: 3,000 emails per month, 100 per day; at the limit sending stops. A per-user quota and a global
  circuit breaker below the provider limit are required.
