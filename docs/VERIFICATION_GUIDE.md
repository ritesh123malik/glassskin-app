# Verification Guide

Run these checks before a production release:

```bash
npm run typecheck
npm test -- --runInBand
scripts/verify-env-vars.sh
scripts/verify-sentry.sh
scripts/verify-abandoned-cart.sh
scripts/measure-performance.sh
scripts/generate-accessibility-report.sh
```

Store manual evidence in `docs/verification/`:

- Sentry crash screenshot with event ID.
- Abandoned cart push notification screenshot and function log.
- Performance JSON from `scripts/measure-performance.sh`.
- Accessibility transcript from a real iOS and Android pass.

Production release is ready only after CI, E2E, payment sandbox checks, and manual device accessibility checks pass.
