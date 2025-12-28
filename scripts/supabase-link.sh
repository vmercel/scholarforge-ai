#!/usr/bin/env bash
set -euo pipefail

# Links the local Supabase CLI to your remote project.
# Prereqs:
# - Install the Supabase CLI: https://supabase.com/docs/guides/cli
# - Export env vars OR put them in `.env.local` and `source` it.
#
# Required env:
# - SUPABASE_ACCESS_TOKEN
# - SUPABASE_PROJECT_REF

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN in environment." >&2
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Missing SUPABASE_PROJECT_REF in environment." >&2
  exit 1
fi

supabase login --token "$SUPABASE_ACCESS_TOKEN" >/dev/null
supabase link --project-ref "$SUPABASE_PROJECT_REF"
echo "Linked to project: $SUPABASE_PROJECT_REF"

