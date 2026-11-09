---
paths:
  - "infra/**"
  - ".github/**"
  - "**/Dockerfile*"
  - "**/compose*.yaml"
  - "**/Caddyfile"
---

# Operations (CLAUDE.md section 6.7)

- **Network and access:**
  - Only Caddy publishes ports. PostgreSQL and api stay in the internal Docker network or on `127.0.0.1`: ports
    published by Docker bypass ufw rules.
  - The provider firewall opens 22, 80, 443.
  - Express: `trust proxy` = 1. Caddy replaces the client IP header value and passes `X-Request-Id`.
- **Images:** multi-stage, `node:26-slim`, non-root user, `read_only` with `tmpfs`, tags by git SHA, memory limits and a
  matching `--max-old-space-size`, Docker log rotation (`max-size`, `max-file`).
- **Zero-downtime deploy:**
  1. backup;
  2. migrations container;
  3. new api via `docker rollout` (or `docker compose up --scale api=2 --no-recreate --wait` with health checks and
     `lb_try_duration` in Caddy);
  4. readiness;
  5. draining the old instance.

  `stop_grace_period` is longer than the drain timeout. Static files are replaced atomically (directory switch).
- **Backups:** a daily `pg_dump -Fc` to a separate R2 bucket (write-only token, lifecycle rule). A weekly automatic
  restore into a separate container with a row count comparison and an alert on failure. A backup without a restore
  check is a hypothesis.
- **Host:** `unattended-upgrades`, SSH by key only, no root login, fail2ban, cleanup of old images.
- **Monitoring and alerts:**
  - external uptime monitoring on `/health/ready` and the home page;
  - alerts on unavailability, growth of 5xx, a failed backup or restore check, disk usage above 80 %, billing alerts;
  - Sentry with `requestId` and `release` (git SHA), source maps from CI;
  - OpenTelemetry traces with auto-instrumentation of HTTP, pg and Prisma — to a free cloud tier with 10–20 % sampling.
