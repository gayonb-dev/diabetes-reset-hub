#!/usr/bin/env bash
# Regenerates the edge-function mirror of the canonical calendar-day service.
set -euo pipefail
cd "$(dirname "$0")/.."
sed -e 's#^// Canonical member calendar-day service (Batch 1, Part B).#// MIRROR of src/lib/calendarDay.ts — do not edit directly.\n// Regenerate with: scripts/sync-calendar-day.sh#' \
  src/lib/calendarDay.ts > supabase/functions/_shared/calendarDay.ts
echo "synced supabase/functions/_shared/calendarDay.ts"
