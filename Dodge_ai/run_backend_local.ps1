Set-Location "$PSScriptRoot\backend"
$stdout = "$PSScriptRoot\.run-logs\backend.out.log"
$stderr = "$PSScriptRoot\.run-logs\backend.err.log"

& "$PSScriptRoot\backend\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 1>> $stdout 2>> $stderr
