Write-Host "Stopping Avatar container..."
try {
    docker stop avatar-app
    docker rm avatar-app
    Write-Host "Stopped."
} catch {
    Write-Host "Container was not running."
}
