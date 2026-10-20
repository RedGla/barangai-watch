param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$python = Join-Path $projectRoot '.venv/Scripts/python.exe'
$checkpoint = Join-Path $projectRoot 'models/efficientnet_b0-v3.pt'
$website = Join-Path $projectRoot 'apps/web/dist'
if (!(Test-Path -LiteralPath $python)) { throw 'Create .venv and install the API and CPU vision dependencies. See README.md.' }
if (!(Test-Path -LiteralPath $checkpoint)) { throw 'The reviewed v3 checkpoint is missing. See ml/TRAINING-RESULTS-V3-2026-10-20.md.' }
if (!(Test-Path -LiteralPath (Join-Path $website 'index.html'))) { throw 'Build the website first: cd apps/web; npm run build' }

# Local presentation only. The confidence cutoff is not field calibrated.
$env:MODEL_CHECKPOINT = $checkpoint
$env:MODEL_APPROVED_SHA256 = '06b5ad7c02112c599c056b9be52fe771a3bdfdb08577897d1a962c1dd2c1f409'
$env:MODEL_CONFIDENCE_THRESHOLD = '0.8'
$env:OMP_NUM_THREADS = '2'
$env:MKL_NUM_THREADS = '2'
$env:STATIC_SITE_DIR = $website
$env:API_ROOT_PATH = ''
$env:COOKIE_SECURE = 'false'
$env:DATABASE_URL = 'sqlite:///' + (Join-Path $projectRoot 'barangai-dev.db').Replace('\', '/')
$env:MEDIA_STORAGE = 'local'
$env:PRIVATE_MEDIA_DIR = Join-Path $projectRoot 'private_media'

Write-Host "Local presentation: http://127.0.0.1:$Port"
Write-Host 'AI is experimental: both held-out tree images were misclassified. Staff verification remains required.'
Push-Location (Join-Path $projectRoot 'apps/api')
try {
    & $python -m uvicorn barangai.main:app --host 127.0.0.1 --port $Port
    if ($LASTEXITCODE -ne 0) { throw "API exited with code $LASTEXITCODE" }
} finally { Pop-Location }
