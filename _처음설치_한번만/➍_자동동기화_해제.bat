@echo off
chcp 65001 >nul
title 4XR 작업기록 자동 동기화 — 해제

echo.
echo   자동 동기화를 끕니다.
echo   (이미 저장된 작업기록 파일은 그대로 남습니다)
echo.

schtasks /delete /tn "4XR_기획전_기록동기화" /f

echo.
echo   해제했습니다. 다시 켜려면 ➌_자동기록동기화.bat 를 더블클릭하세요.
echo.
pause
