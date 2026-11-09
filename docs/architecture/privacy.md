# 5.13 Privacy and legal requirements

This is an engineering interpretation of GDPR and ePrivacy, not legal advice.

- **A cookie banner is not needed if:**
  - session cookies are set only after sign-in (strictly necessary);
  - Web Vitals are sent without cookies, localStorage or device identifiers.
- **Metrics:**
  - IP is used only for rate limiting with a short TTL and is not stored with metrics;
  - the user agent is coarsened;
  - raw events are kept for 30–90 days, aggregates longer;
  - the legal basis is legitimate interest (Art. 6(1)(f) GDPR), stated in the policy.
- **Documents:** a privacy policy and terms of use in `ru`/`en` — before configuring the Google OAuth consent screen.
  They include a contact for data subject requests and the list of subprocessors (Cloudflare, Resend, Sentry, Google,
  hosting).
- Sentry has personal data filtering enabled.
- User rights: self-service account deletion with a cascade and data export (section 5.7).
