#!/usr/bin/env bash
set -euo pipefail

echo "=== Sentry verification ==="

if ! grep -R "@sentry/react-native" -n App.tsx src app.json >/dev/null 2>&1; then
  echo "Sentry package is installed but no app integration was found."
  exit 1
fi

if ! grep -R "SENTRY_AUTH_TOKEN" -n .github eas.json docs >/dev/null 2>&1; then
  echo "SENTRY_AUTH_TOKEN is not documented in CI/EAS docs."
  exit 1
fi

echo "Sentry integration references found. Run a manual test crash on a preview build and capture the event ID."
