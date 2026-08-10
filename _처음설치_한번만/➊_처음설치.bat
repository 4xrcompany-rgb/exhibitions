@echo off
chcp 65001 >nul
title 4XR 기획전 자동화 - 처음 설치
echo.
echo    ============================================
echo      4XR 기획전 자동화  :  처음 설치 (1번만)
echo    ============================================
echo.
echo    준비물을 자동으로 설치합니다. 5~10분 걸려요.
echo    창이 바쁘게 움직여도 그냥 두시고, 끝날 때까지 기다리세요.
echo.
echo    (먼저 Node.js 와 Python 이 설치돼 있어야 합니다 - 설명서 0단계)
echo.
pause
echo.
echo    [1/4] 클로드 코드 설치 중...
call npm install -g @anthropic-ai/claude-code
echo.
echo    [2/4] 엑셀 / 이미지 처리 도구 설치 중...
call pip install openpyxl pillow requests beautifulsoup4
echo.
echo    [3/4] 배너 캡처용 브라우저 설치 중...
call npm install playwright
echo.
echo    [4/4] 브라우저 엔진 내려받는 중...
call npx playwright install chromium
echo.
echo    ============================================
echo      설치 끝!  이 창을 닫으셔도 됩니다.
echo    ============================================
echo.
pause
