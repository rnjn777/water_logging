@echo off
REM Test admin login and fetch reports

echo.
echo ========================================
echo Testing Water Logging Admin API
echo ========================================
echo.

echo 1️⃣  Testing Admin Login...
echo.
powershell -Command ^
  "$response = Invoke-WebRequest -Uri 'http://localhost:5001/api/auth/login' ^
    -Method POST ^
    -Body (ConvertTo-Json @{email='admin@test.com'; password='admin123'; role='ADMIN'}) ^
    -ContentType 'application/json' ^
    -UseBasicParsing; ^
  $data = ConvertFrom-Json $response.Content; ^
  Write-Host '✅ Login Response:'; ^
  Write-Host ($data | ConvertTo-Json); ^
  $token = $data.token; ^
  Write-Host ''; ^
  Write-Host '2️⃣  Fetching Admin Reports with Token...'; ^
  Write-Host ''; ^
  $reportsRes = Invoke-WebRequest -Uri 'http://localhost:5001/api/reports/admin' ^
    -Headers @{'Authorization'='Bearer ' + $token} ^
    -ContentType 'application/json' ^
    -UseBasicParsing; ^
  $reports = ConvertFrom-Json $reportsRes.Content; ^
  Write-Host '✅ Reports Response:'; ^
  Write-Host ($reports | ConvertTo-Json);"

echo.
echo ========================================
echo ✅ Tests Complete!
echo ========================================
echo.
echo Open your browser to: http://localhost:8000/index.html
echo Admin Login: admin@test.com / admin123
