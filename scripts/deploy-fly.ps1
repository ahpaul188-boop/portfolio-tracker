# Fly.io one-shot deploy (run after: flyctl auth login)
# Usage: .\scripts\deploy-fly.ps1

$ErrorActionPreference = "Stop"
$env:Path = "$env:USERPROFILE\.fly\bin;" + $env:Path

Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Checking Fly login..."
flyctl auth whoami

$app = "portfolio-tracker"
$exists = flyctl apps list 2>$null | Select-String $app
if (-not $exists) {
  Write-Host "Creating app $app..."
  flyctl apps create $app --org personal 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "If name is taken, edit app name in fly.toml and re-run."
    flyctl launch --no-deploy --copy-config --yes
  }
}

$vol = flyctl volumes list -a $app 2>$null | Select-String "data"
if (-not $vol) {
  Write-Host "Creating volume..."
  flyctl volumes create data --region hkg --size 1 -a $app -y
}

if (Test-Path .env) {
  $authSecret = (Get-Content .env | Where-Object { $_ -match '^AUTH_SECRET=' }) -replace '^AUTH_SECRET="?|"$', ''
  if ($authSecret) {
    flyctl secrets set "AUTH_SECRET=$authSecret" -a $app
  }
}

$appUrl = "https://$app.fly.dev"
flyctl secrets set "AUTH_URL=$appUrl" -a $app

Write-Host "Deploying to $appUrl ..."
flyctl deploy -a $app

Write-Host "Done. Open $appUrl/api/health"
