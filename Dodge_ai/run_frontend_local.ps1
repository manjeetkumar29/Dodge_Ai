Set-Location "$PSScriptRoot\frontend"
$stdout = "$PSScriptRoot\.run-logs\frontend.out.log"
$stderr = "$PSScriptRoot\.run-logs\frontend.err.log"
$env:BROWSER = "none"

& npm start 1>> $stdout 2>> $stderr
