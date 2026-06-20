#!/usr/bin/env bash
echo "Stopping Avatar container..."
docker stop avatar-app 2>/dev/null && docker rm avatar-app 2>/dev/null && echo "Stopped." || echo "Container was not running."
