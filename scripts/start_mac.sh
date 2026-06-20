#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "Stopping any existing Avatar container..."
docker stop avatar-app 2>/dev/null || true
docker rm avatar-app 2>/dev/null || true

echo "Building Avatar container..."
docker build -t avatar-app .

echo "Starting Avatar container..."
docker run -d \
  --name avatar-app \
  -p 8000:8000 \
  --env-file .env \
  -v "$(pwd)/knowledge:/app/knowledge:ro" \
  avatar-app

echo "Avatar is running at http://localhost:8000"
echo "Admin dashboard: http://localhost:8000/admin"
