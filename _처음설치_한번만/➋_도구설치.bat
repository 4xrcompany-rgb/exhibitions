@echo off
chcp 949 >nul
title 4XR 처음설치 (2) 도구
echo.
echo    ============================================
echo      (2) 엑셀 / 이미지 / 배너 도구 자동 설치
echo    ============================================
echo.
echo    창이 바쁘게 움직여도 그냥 두세요. (5~10분)
echo    ( 프로그램설치.bat 를 먼저 끝낸 뒤 실행하세요 )
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
  echo    [!] Node.js 가 아직 안 잡힙니다.
  echo        프로그램설치.bat 를 먼저 실행하고, 컴퓨터를 한 번 재시작한 뒤 다시 해보세요.
  echo.
  pause
  exit /b
)

echo    [1/4] 클로드 코드 ...
call npm install -g @anthropic-ai/claude-code
echo    [2/4] 엑셀 / 이미지 도구 ...
call pip install openpyxl pillow requests beautifulsoup4
echo    [3/4] 배너 캡처 브라우저 ...
call npm install playwright
echo    [4/4] 브라우저 엔진 ...
call npx playwright install chromium

echo.
echo    ============================================
echo      설치 끝!  이 창을 닫으셔도 됩니다.
echo    ============================================
echo.
pause
