$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Stopping any existing Avatar container..."
docker stop avatar-app 2>$null; docker rm avatar-app 2>$null

Set-Location $projectRoot

Write-Host "Building Avatar container..."
docker build -t avatar-app .

Write-Host "Starting Avatar container..."
docker run -d `
  --name avatar-app `
  -p 8000:8000 `
  --env-file .env `
  -v "${projectRoot}/knowledge:/app/knowledge:ro" `
  avatar-app

Write-Host "Avatar is running at http://localhost:8000"
Write-Host "Admin dashboard: http://localhost:8000/admin"
