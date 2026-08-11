@echo off
chcp 949 >nul
title 4XR 관리자 - 전체보기 볼트 설정

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   관리자 권한이 필요합니다. 곧 뜨는 창에서 "예" 를 눌러주세요...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo   ==========================================
echo     4XR 관리자 : 전체보기 볼트 만들기
echo   ==========================================
echo   3개 자동화 저장소(exhibitions / selecshop / records)를
echo   한 폴더에 모아 옵시디언 한 화면에서 다 보이게 합니다.
echo.

set "VAULT=%USERPROFILE%\Documents\4XR_all"
if not exist "%VAULT%" mkdir "%VAULT%"

set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not exist "%GIT%" set "GIT=git"
set "PATH=%PATH%;%ProgramFiles%\Git\cmd"

echo   [1/3] 저장소 3개 받기 - 로그인 창이 뜨면 "회사 GitHub 아이디" 로 로그인하세요.
for %%R in (exhibitions 4xr-selecshop-automation 4xr-records) do (
  if exist "%VAULT%\%%R\.git" (
    echo         %%R : 최신으로 갱신
    "%GIT%" -C "%VAULT%\%%R" pull --no-edit
  ) else (
    echo         %%R : 새로 받기
    "%GIT%" clone https://github.com/4xrcompany-rgb/%%R.git "%VAULT%\%%R"
  )
)

echo.
echo   [2/3] 자동 최신화(30분마다) 설정...
if exist "%VAULT%\exhibitions\★건들지마세요(시스템)\관리자도구\sync_all.ps1" (
  copy /y "%VAULT%\exhibitions\★건들지마세요(시스템)\관리자도구\sync_all.ps1" "%VAULT%\_sync_all.ps1" >nul
  schtasks /create /f /tn "4XR_all_sync" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File \"%VAULT%\_sync_all.ps1\"" /sc minute /mo 30 /rl highest >nul
  schtasks /run /tn "4XR_all_sync" >nul
  echo         등록 완료 (작업 이름: 4XR_all_sync)
) else (
  echo         [주의] sync_all.ps1 을 못 찾았습니다. exhibitions 받기가 안 된 듯해요.
  echo                이 파일을 다시 실행해 주세요.
)

echo.
echo   [3/3] 완료!
echo   ==========================================
echo    옵시디언을 열고 "다른 폴더를 보관소로 열기" 에서
echo    아래 폴더를 선택하세요:
echo.
echo        %VAULT%
echo.
echo   ==========================================
echo    그러면 3개 자동화 기록이 한 그래프에 모두 나옵니다.
echo    (30분마다 자동으로 최신화됩니다.)
echo.
pause
