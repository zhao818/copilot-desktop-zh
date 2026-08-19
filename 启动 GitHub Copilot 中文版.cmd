@echo off
chcp 65001 >nul
title GitHub Copilot ZH Launcher
echo [copilot-zh] Starting GitHub Copilot with Chinese localization...
set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 --lang=zh-CN
start "" "%~dp0..\github.exe"
where node >nul 2>nul
if %errorlevel%==0 (
  set NODE_CMD=node
) else (
  echo [copilot-zh] ERROR: Node.js not found in PATH. Please install Node.js: https://nodejs.org
  echo [copilot-zh] Then run this launcher again.
  pause
  exit /b 1
)
"%NODE_CMD%" "%~dp0inject.js"
echo [copilot-zh] Injector exited. The app may no longer be localized.
pause
