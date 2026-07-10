@echo off
set SCRIPT_DIR=C:\github\market-checker
set NODE_EXE=node

echo [INFO] Market Checker 자동화 스케줄 등록 중...

:: 기존 작업 삭제
schtasks /delete /tn Market_Checker /f >nul 2>&1

:: 07:48 — 국장 개장 전 방향 체크리스트 (하루 1회)
schtasks /create /tn Market_Checker /tr "cmd /c cd /d %SCRIPT_DIR% && %NODE_EXE% src/main.js >> %SCRIPT_DIR%\market-checker.log 2>&1" /sc daily /st 07:48 /f

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] 스케줄 등록 완료!
    echo   - Market_Checker : 매일 07:48 ^(국장 개장 전 체크리스트^)
) else (
    echo [ERROR] 등록 실패. 관리자 권한으로 다시 실행해 주세요.
)

pause
