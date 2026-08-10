@echo off
chcp 65001 >nul
title 4XR 작업기록 자동 동기화 — 설정 (한 번만)

for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "PS=%ROOT%\.claude\skills\gihoekjeon-automation-system\scripts\setup_auto_sync.ps1"

echo.
echo   이 파일은 "작업기록이 회사로 자동으로 올라가게" 만들어 줍니다.
echo   컴퓨터마다 한 번만 실행하면 됩니다.
echo.

if not exist "%PS%" (
  echo   [오류] 설정 스크립트를 찾을 수 없습니다.
  echo   %PS%
  echo.
  echo   회사 폴더 안에서 실행했는지 확인해 주세요.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS%"

echo.
pause
