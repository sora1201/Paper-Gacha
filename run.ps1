$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $appRoot '.venv'
if (-not (Test-Path $venvPath)) { py -3.13 -m venv $venvPath }
& (Join-Path $venvPath 'Scripts\python.exe') -m pip install -r (Join-Path $appRoot 'requirements.txt')
& (Join-Path $venvPath 'Scripts\python.exe') (Join-Path $appRoot 'desktop_app.py')
