@echo off
chcp 65001 >nul
title 4XR 기획전 - 처음 시작 (직원용)

:: ── 관리자 권한 자동 승격 (한 번 "예") ──────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   관리자 권한이 필요합니다. 곧 뜨는 창에서 "예" 를 눌러주세요...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo   ===========================================
echo     4XR 기획전 자동화 : 처음 시작 (한 번만)
echo   ===========================================
echo.
echo   이 컴퓨터를 회사 시스템에 연결합니다.
echo   중간에 창이 바쁘게 움직여도 그냥 두세요.
echo.

set "WORKER="
set /p "WORKER=  ▶ 이름을 입력하고 Enter (예: 황다빈): "
if "%WORKER%"=="" set "WORKER=이름미정"

set "DEST=%USERPROFILE%\Documents\4XR_기획전"

echo.
echo   [1/4] 필수 프로그램 설치 (Git · Node · Python)...
where winget >nul 2>&1
if %errorlevel%==0 (
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
) else (
  echo         [주의] winget 이 없어 자동설치를 건너뜁니다. Git 이 미리 깔려 있어야 합니다.
)
set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not exist "%GIT%" set "GIT=git"
set "PATH=%PATH%;%ProgramFiles%\Git\cmd"

echo.
echo   [2/4] 회사 폴더 받기 — 로그인 창이 뜨면 "회사 GitHub 아이디" 로 로그인하세요.
if exist "%DEST%\.git" (
  echo         이미 받아져 있음 → 최신으로 갱신합니다.
  "%GIT%" -C "%DEST%" pull
) else (
  "%GIT%" clone https://github.com/4xrcompany-rgb/exhibitions.git "%DEST%"
)
if not exist "%DEST%\.git" (
  echo.
  echo   [실패] 폴더를 받지 못했습니다. (로그인 취소 / 인터넷 / 권한 문제)
  echo          이 파일을 다시 실행하거나 관리자에게 문의하세요.
  echo.
  pause
  exit /b
)

echo.
echo   [3/4] 내 이름 등록 (%WORKER%)...
> "%DEST%\WHOAMI.txt" echo %WORKER%

echo.
echo   [4/4] 작업기록 자동 동기화 설정...
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEST%\.claude\skills\gihoekjeon-automation-system\scripts\setup_auto_sync.ps1"

echo.
echo   ===========================================
echo     끝! 준비 완료입니다.
echo   ===========================================
echo    · 작업 폴더 :  %DEST%
echo    · 코워크(또는 클로드 코드)에서 위 폴더를 열고 채팅으로 작업하세요.
echo    · 작업기록은 30분마다 자동으로 회사에 올라갑니다.
echo.
echo    (클로드 코드로 직접 작업한다면: 폴더 안
echo     _처음설치_한번만\➋_도구설치.bat 를 한 번 더 실행하세요.)
echo.
pause
