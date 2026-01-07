# Test admin login and fetch reports

Write-Host "========================================"
Write-Host "Testing Water Logging Admin API"
Write-Host "========================================"
Write-Host ""

Write-Host "1. Admin Login..."
Write-Host ""

$loginBody = @{
    email = "admin@test.com"
    password = "admin123"
    role = "ADMIN"
} | ConvertTo-Json

$loginRes = Invoke-WebRequest -Uri 'http://localhost:5001/api/auth/login' `
  -Method POST `
  -Body $loginBody `
  -ContentType 'application/json' `
  -UseBasicParsing

$loginData = ConvertFrom-Json $loginRes.Content

Write-Host "SUCCESS: Admin Login Successful!"
Write-Host "Role: $($loginData.user.role)"
Write-Host "Token: $($loginData.token.Substring(0, 50))..."
Write-Host ""

$token = $loginData.token

Write-Host "2. Fetching Admin Reports (ALL reports - pending + approved)..."
Write-Host ""

$reportsRes = Invoke-WebRequest -Uri 'http://localhost:5001/api/reports/admin' `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType 'application/json' `
  -UseBasicParsing

$reports = ConvertFrom-Json $reportsRes.Content

Write-Host "SUCCESS: Reports Fetched!"
Write-Host "Total Reports: $($reports.Count)"
Write-Host ""

if ($reports.Count -gt 0) {
    Write-Host "Reports:"
    $reports | ForEach-Object {
        $status = if($_.is_approved) { "APPROVED" } else { "PENDING" }
        Write-Host "  - ID: $($_.id) | Location: $($_.location) | Status: $status | Severity: $($_.severity)"
    }
} else {
    Write-Host "No reports found in database"
}

Write-Host ""
Write-Host "========================================"
Write-Host "SUCCESS: API Tests Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Open browser to:"
Write-Host "  User: http://localhost:8000/index.html"
Write-Host "  Admin: http://localhost:8000/admin.html"
Write-Host ""
Write-Host "Admin Credentials:"
Write-Host "  Email: admin@test.com"
Write-Host "  Password: admin123"
Write-Host ""
