#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ALIAS='--alias:@sdq/shared=./libs/shared/src/index.ts'

bundle_api() {
  local entry="$1"
  local out="$2"
  npx esbuild "$entry" --bundle --platform=node --format=cjs "$ALIAS" --outfile="$out"
}

bundle_api server/src/vercel/api-judge.ts api/judge.js
bundle_api server/src/vercel/api-sessions.ts api/sessions.js
bundle_api server/src/vercel/api-leaderboard.ts api/leaderboard.js
bundle_api server/src/vercel/api-cron.ts api/cron.js
bundle_api server/src/vercel/api-auth.ts api/auth.js
npx nx run client:build
