#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"

echo "Smoke: $BASE_URL"

curl -f "$BASE_URL/login" >/dev/null
curl -f "$BASE_URL/api/auth/session" >/dev/null

echo "Smoke test passed"
