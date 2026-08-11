@echo off
chcp 949 >nul
title 4XR 처음설치 (1) 프로그램

:: --- 관리자 권한이 아니면 스스로 다시 실행 (한 번만 '예' 눌러주세요) ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   관리자 권한이 필요합니다. 곧 뜨는 창에서 "예" 를 눌러주세요...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo    ============================================
echo      (1) 기본 프로그램 자동 설치
echo    ============================================
echo.
echo    Node.js / Python / Git 을 자동으로 설치합니다.
echo    창이 바쁘게 움직여도 그냥 두세요. (5~10분)
echo.

where winget >nul 2>&1
if %errorlevel% neq 0 (
  echo    [!] 이 컴퓨터에 자동설치 도구(winget)가 없습니다.
  echo        Windows "앱 설치 관리자(App Installer)" 를 스토어에서 업데이트한 뒤 다시 실행하거나,
  echo        설명서 0단계의 웹 다운로드 방법으로 설치하세요.
  echo.
  pause
  exit /b
)

echo    [1/3] Node.js ...
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
echo    [2/3] Python ...
winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
echo    [3/3] Git ...
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements

echo.
echo    ============================================
echo      (1) 끝!  이 창을 닫고,
echo      이어서  도구설치.bat  를 더블클릭하세요.
echo    ============================================
echo.
pause
