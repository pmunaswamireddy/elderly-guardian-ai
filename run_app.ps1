# Elderly Guardian AI - Launch Script

Write-Host "Starting Elderly Guardian AI..." -ForegroundColor Cyan

Write-Host "Cleaning up existing processes on ports 8007 and 3000..." -ForegroundColor Yellow
$ports = @(8007, 3000)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processes) {
        if ($processId) {
            Write-Host "Stopping process $processId on port $port..." -ForegroundColor Gray
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2

# Start Backend in a new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py" -WindowStyle Normal

# Start Frontend in a new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --port 3000" -WindowStyle Normal

Write-Host "Services are starting in separate windows." -ForegroundColor Green
Write-Host "Backend: http://localhost:8007" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services are now running in separate windows." -ForegroundColor White
Write-Host "You can now log in or sign up without fetch errors." -ForegroundColor Green
Write-Host "-------------------------------" -ForegroundColor White
Write-Host "Network Access: Use your Local IP (shown in the frontend terminal window)." -ForegroundColor Yellow
