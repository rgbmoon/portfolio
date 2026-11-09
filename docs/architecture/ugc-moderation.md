# 5.8 User content and moderation

Publications, the drawing canvas, profile names and reports are user-generated content (UGC). All UGC modules use the
shared moderation module (`moderation`) through its public interface. The numbers below are starting values, refined in
iterations 6 and 10.

**Moderation module:**
- Stores the user status (`active`, `restricted`, `banned`), trust level, reports, sanctions and violation signals.
- Provides `PolicyService`: a single check "may the user create or modify a resource" — status, trust level, personal
  quotas, global ceilings.
- Publishes the events `user.restricted`, `user.banned`, `user.unbanned`; UGC modules hide or restore content on them.

**Write permission:**
- Only an authenticated user with a verified email.
- Turnstile on publication creation.

**Trust levels** (modeled on Discourse):
- `0` — new (account younger than 24 hours): minimal quotas, no links and no image uploads.
- `1` — basic (after 24 hours without violations): standard quotas.
- `2` — trusted (assigned by the administrator): extended quotas.

**Quotas** (starting values):
- active publications per user — 5;
- blocks per publication — 50, text — 20,000 characters, images — 10;
- files per user — 25 MB, one image — 5 MB;
- reports from one user — 10 per day.

**Global ceilings:**
- the total number of publications and the total storage volume (below the free 10 GB of R2);
- when a ceiling is reached, a circuit breaker disables creation and the administrator receives a notification.

**Content:**
- A publication is stored as structured JSON blocks validated by Zod. Raw HTML is neither accepted nor rendered.
- Links — only `http`/`https`, rendered with `rel="ugc nofollow noopener"`.
- UGC pages are served with `noindex` by default. The final decision is made together with publication rendering in
  iteration 10.
- Images — only through our own upload pipeline (section 5.11). External image URLs are rejected: this protects
  against SSRF and tracking pixels.
- Repeated identical content (hash) and matches against the word and domain stop lists are blocked on save.
- Profile names: validation, reserved names, stop list.

**Reports and hiding:**
- A "Report" button for authenticated users.
- After N reports from different users (for example 3) the content is hidden automatically until an administrator
  reviews it.
- Moderation mode — post-moderation. Pre-moderation for trust level 0 can be enabled by a setting.

**Automatic sanctions:**
- Violation signals (repeated 429s, stop-list hits, confirmed reports, Turnstile failures) accumulate in a signals
  table.
- Exceeding a threshold within a window results in a temporary write restriction (for example 1 hour). A repeat
  escalates.

**Administrator sanctions:** warning → write restriction for a period → ban for a period → permanent ban.
- A ban revokes all sessions, blocks sign-in and hides content.
- The reason and term are recorded in `audit_log`.
- Ban via the Better Auth admin plugin (reason and term) — check in iteration 6.

**Protection against re-registration:**
- a limit on registrations per IP and subnet per day;
- a block list of disposable email domains (open list);
- Turnstile.
- Device fingerprinting is not used (privacy).

**Administrator tools:** report queue, hiding and restoring content, deleting all content of a user in one operation,
clearing the canvas, managing sanctions.

**Demo content lifetime:** automatic deletion of inactive demo publications (for example after 30 days without
changes) — decided in iteration 10.
