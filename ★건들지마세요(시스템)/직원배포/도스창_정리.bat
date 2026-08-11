@echo off
chcp 949 >nul
title 4XR - 도스창 깜빡임 정리

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   관리자 권한이 필요합니다. 곧 뜨는 창에서 "예" 를 눌러주세요...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo   ==========================================
echo     4XR : 도스창 깜빡임 정리
echo   ==========================================
echo   중복/잘못 등록된 동기화 작업을 정리하고
echo   깨끗한 것 하나만 다시 등록합니다.
echo.

set "DEST=%USERPROFILE%\Documents\4XR_기획전"
set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not exist "%GIT%" set "GIT=git"

echo   [1/2] 최신 정리 스크립트 받기...
if exist "%DEST%\.git" (
  "%GIT%" -C "%DEST%" pull --no-edit
) else (
  echo         [주의] 작업자 저장소가 없습니다. 4XR_시작.bat 을 먼저 실행하세요.
)

echo.
echo   [2/2] 정리 실행...
set "FIX=%DEST%\.claude\skills\gihoekjeon-automation-system\scripts\fix_sync.ps1"
if exist "%FIX%" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%FIX%"
) else (
  echo         [주의] 정리 스크립트를 못 찾았습니다: %FIX%
  echo                4XR_시작.bat 을 한 번 실행한 뒤 다시 시도하세요.
)

echo.
echo   끝! 바탕화면의 "4XR_동기화_정리결과.txt" 를 확인하세요.
echo   (그 내용을 관리자에게 보내주면 원인까지 확인됩니다.)
echo.
pause
