@echo off
chcp 949 >nul
title 4XR 기획전 - 처음 시작 (직원용)

:: 관리자 권한 자동 승격 (딱 한 번 "예")
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   관리자 권한이 필요합니다. 곧 뜨는 창에서 "예" 를 눌러주세요...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo   ==========================================
echo     4XR 기획전 자동화 : 처음 시작 (한 번만)
echo   ==========================================
echo.
echo   이 컴퓨터를 회사 시스템에 연결합니다.
echo   중간에 창이 바쁘게 지나가도 그냥 두세요.
echo.

set "DEST=%USERPROFILE%\Documents\4XR_기획전"

set "WORKER="
set /p "WORKER=  이름을 입력하고 Enter (예: 황다빈): "
if "%WORKER%"=="" set "WORKER=이름없음"

echo.
echo   [1/5] 필수 프로그램 설치 (Git, Node, Python)...
where winget >nul 2>&1
if %errorlevel%==0 (
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
) else (
  echo         [주의] winget 이 없어 자동설치를 건너뜁니다. Git 은 미리 깔려 있어야 합니다.
)
set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not exist "%GIT%" set "GIT=git"
set "PATH=%PATH%;%ProgramFiles%\Git\cmd;%ProgramFiles%\nodejs;%APPDATA%\npm"

echo.
echo   [2/5] 회사 자료 받기 - 로그인 창이 뜨면 "회사 GitHub 아이디" 로 로그인하세요.
if exist "%DEST%\.git" (
  echo         이미 받았던 폴더. 최신으로 갱신합니다.
  "%GIT%" -C "%DEST%" pull --no-edit
) else (
  "%GIT%" clone https://github.com/4xrcompany-rgb/exhibitions.git "%DEST%"
)
if not exist "%DEST%\.git" (
  echo.
  echo   [오류] 자료를 받지 못했습니다. 로그인 취소 또는 인터넷/권한 문제일 수 있어요.
  echo          이 파일을 다시 실행하거나 관리자에게 문의하세요.
  echo.
  pause
  exit /b
)

echo.
echo   [3/5] 캡처 도구(Playwright) 설치 - 배너/섹션 이미지 만들 때 필요합니다.
echo         (처음 한 번만 크롬 엔진을 내려받아요. 몇 분 걸릴 수 있어요.)
where npm >nul 2>&1
if %errorlevel%==0 (
  pushd "%DEST%\.claude\skills\gihoekjeon-automation-system\scripts"
  call npm install playwright --no-audit --no-fund --loglevel=error
  call npx --yes playwright install chromium
  popd
) else (
  echo         [주의] Node 가 아직 준비 안 됐어요. Node 를 방금 처음 설치했다면
  echo                이 파일을 한 번 더 실행하면 Playwright 가 깔립니다.
)

echo.
echo   [4/5] 내 이름 등록 + 작업기록 자동 동기화 설정...
powershell -NoProfile -Command "[IO.File]::WriteAllText('%DEST%\WHOAMI.txt', $env:WORKER, (New-Object System.Text.UTF8Encoding($false)))"
powershell -NoProfile -ExecutionPolicy Bypass -File "%DEST%\.claude\skills\gihoekjeon-automation-system\scripts\setup_auto_sync.ps1"

echo.
echo   [5/5] 작업자에게 필요 없는 폴더/파일 숨김...
if exist "%DEST%\★건들지마세요(시스템)" attrib +h "%DEST%\★건들지마세요(시스템)"
if exist "%DEST%\.claude" attrib +h "%DEST%\.claude"
if exist "%DEST%\CLAUDE.md" attrib +h "%DEST%\CLAUDE.md"
if exist "%DEST%\.mcp.json" attrib +h "%DEST%\.mcp.json"
if exist "%DEST%\.gitignore" attrib +h "%DEST%\.gitignore"
if exist "%DEST%\.gitattributes" attrib +h "%DEST%\.gitattributes"
if exist "%DEST%\WHOAMI.txt" attrib +h "%DEST%\WHOAMI.txt"
if exist "%DEST%\.git" attrib +h "%DEST%\.git"

echo.
echo   ==========================================
echo     끝! 준비 완료입니다.  (작업자: %WORKER%)
echo   ==========================================
echo    작업 폴더 :  %DEST%
echo    ( 폴더 안에 기획전_제작 / _처음설치_한번만 / 사용설명서.html 만 보이면 정상 )
echo.
echo    이제 코워크(또는 클로드 코드)에서 이 폴더를 열고
echo    채팅으로 작업하면 됩니다.
echo    작업기록은 30분마다 자동으로 회사에 올라갑니다.
echo.
pause
