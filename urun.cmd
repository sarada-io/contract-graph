@echo off
where node >nul 2>&1
if errorlevel 1 (
  echo urun needs Node.js 18.17 or newer. 1>&2
  exit /b 1
)
node "%~dp0scripts\urun.mjs" %*
exit /b %errorlevel%
