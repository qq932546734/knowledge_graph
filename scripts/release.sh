#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Build images"
docker compose build

echo "[2/4] Start database"
docker compose up -d db

echo "[3/4] Run migrations"
docker compose run --rm app npm run prisma:migrate:deploy

echo "[4/4] Start app + nginx"
docker compose up -d app nginx

echo "Release finished."
