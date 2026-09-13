@echo off
where pwsh >nul 2>&1
if errorlevel 1 (
  echo urun needs PowerShell 7. Install it with: winget install --id Microsoft.PowerShell --source winget 1>&2
  exit /b 1
)
pwsh -NoLogo -NoProfile -File "%~dp0scripts\urun.ps1" %*
exit /b %errorlevel%
