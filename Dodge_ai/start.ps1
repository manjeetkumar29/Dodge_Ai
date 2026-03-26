$envFile = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  if ($content -match "GROQ_API_KEY=gsk_your_key_here") {
    Write-Host "Update backend/.env with your real GROQ_API_KEY before starting." -ForegroundColor Yellow
  }
}

Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000`""

Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run start`""
