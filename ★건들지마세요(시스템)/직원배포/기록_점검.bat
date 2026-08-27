@echo off
chcp 949 >nul
title 4XR - 기록 안 올라옴 점검

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   관리자 권한이 필요합니다. 곧 뜨는 창에서 "예" 를 눌러주세요...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo   ==========================================
echo     4XR : 기록이 안 올라오는 원인 점검
echo   ==========================================
echo.

set "DEST=%USERPROFILE%\Documents\4XR_기획전"
set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not exist "%GIT%" set "GIT=git"

echo   [1/2] 최신 점검 스크립트 받기...
if exist "%DEST%\.git" (
  "%GIT%" -C "%DEST%" pull --no-edit
) else (
  echo         [주의] 작업자 저장소가 없습니다. 4XR_시작.bat 을 먼저 실행하세요.
)

echo.
echo   [2/2] 점검 실행...
set "CHK=%DEST%\.claude\skills\gihoekjeon-automation-system\scripts\check_log.ps1"
if exist "%CHK%" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CHK%"
) else (
  echo         [주의] 점검 스크립트를 못 찾았습니다: %CHK%
  echo                4XR_시작.bat 을 한 번 실행한 뒤 다시 시도하세요.
)

echo.
echo   끝! 바탕화면의 "4XR_기록점검.txt" 를 관리자에게 보내주세요.
echo.
pause
