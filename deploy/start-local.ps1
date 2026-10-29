param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$python = Join-Path $projectRoot '.venv/Scripts/python.exe'
$checker = Join-Path $projectRoot 'apps/api/models/mobileclip2-s0'
$website = Join-Path $projectRoot 'apps/web/dist'
if (!(Test-Path -LiteralPath $python)) { throw 'Create .venv and install the API with its AI extra. See README.md.' }
if (!(Test-Path -LiteralPath (Join-Path $checker 'visual.onnx'))) { throw 'The category checker is missing. Run apps/api/tools/export_checker.py.' }
if (!(Test-Path -LiteralPath (Join-Path $website 'index.html'))) { throw 'Build the website first: cd apps/web; npm run build' }

# Local presentation only. The checker's cutoff is not field calibrated. Cloudflare vision runs only when
# CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_TOKEN are already set in this shell.
$env:CHECKER_MODEL_DIR = $checker
$env:VALIDATED_EMBEDDING_MODEL_VERSION = 'mobileclip2-s0:effec85f7f21'
$env:CHECKER_THREADS = '2'
$env:GEOCODER = 'nominatim'
$env:STATIC_SITE_DIR = $website
$env:API_ROOT_PATH = ''
$env:COOKIE_SECURE = 'false'
$env:DATABASE_URL = 'sqlite:///' + (Join-Path $projectRoot 'barangai-dev.db').Replace('\', '/')
$env:MEDIA_STORAGE = 'local'
$env:PRIVATE_MEDIA_DIR = Join-Path $projectRoot 'private_media'

Write-Host "Local presentation: http://127.0.0.1:$Port"
Write-Host 'AI suggestions are experimental and not field validated. Residents review them; staff verify every report.'
Push-Location (Join-Path $projectRoot 'apps/api')
try {
    & $python -m uvicorn barangai.main:app --host 127.0.0.1 --port $Port
    if ($LASTEXITCODE -ne 0) { throw "API exited with code $LASTEXITCODE" }
} finally { Pop-Location }
