#!/usr/bin/env bash
set -euo pipefail

echo "=== Abandoned cart verification ==="

required_files=(
  "supabase/functions/abandoned-cart-reminder/index.ts"
  "supabase/migrations/20260716000400_notification_cron_and_triggers.sql"
  "docs/PUSH_NOTIFICATIONS_SETUP.md"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Missing $file"
    exit 1
  fi
done

grep -R "cart_reminders" supabase/functions supabase/migrations >/dev/null
grep -R "cart_reminder_log" supabase/functions supabase/migrations >/dev/null

echo "Abandoned cart reminder function, preference gate, and cooldown log are present."
