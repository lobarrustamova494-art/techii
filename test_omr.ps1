#!/usr/bin/env pwsh

Write-Host "🧪 Testing OMR endpoint..." -ForegroundColor Green

# Test data
$answerKey = '["A","B","C","D","A"]'
$scoring = '{"correct":1,"wrong":0,"blank":0}'
$examId = "test-exam-id"

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

# Read the test image
$imageBytes = [System.IO.File]::ReadAllBytes("test_image.jpg")

# Build form data
$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"image`"; filename=`"test_image.jpg`"",
    "Content-Type: image/jpeg",
    "",
    [System.Text.Encoding]::Latin1.GetString($imageBytes),
    "--$boundary",
    "Content-Disposition: form-data; name=`"answerKey`"",
    "",
    $answerKey,
    "--$boundary", 
    "Content-Disposition: form-data; name=`"scoring`"",
    "",
    $scoring,
    "--$boundary",
    "Content-Disposition: form-data; name=`"examId`"",
    "",
    $examId,
    "--$boundary--"
)

$body = $bodyLines -join $LF

Write-Host "📤 Sending request..." -ForegroundColor Yellow
Write-Host "Answer Key: $answerKey" -ForegroundColor Cyan
Write-Host "Scoring: $scoring" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:10000/api/omr/process" `
        -Method POST `
        -Body $body `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -UseBasicParsing
    
    Write-Host "📥 Response status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📥 Response:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Request successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Request failed" -ForegroundColor Red
    }
} catch {
    Write-Host "🚨 Test error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "`n✅ Test completed" -ForegroundColor Green