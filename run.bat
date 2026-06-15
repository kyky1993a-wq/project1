@echo off
title 육아 자동 일기

echo =========================================
echo   육아 자동 일기 시작
echo =========================================
echo.

REM Node.js PATH 설정 (scoop 설치)
set PATH=%USERPROFILE%\scoop\apps\nodejs\current;%USERPROFILE%\scoop\shims;%PATH%

REM Python 가상환경 확인
if not exist "backend\venv\Scripts\activate.bat" (
    echo [!] Python 가상환경이 없습니다. setup.bat를 먼저 실행하세요.
    pause
    exit /b 1
)

echo [1/2] 백엔드 서버 시작 (포트 8000)...
start "백엔드 - FastAPI" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] 프론트엔드 시작 (포트 5173)...
start "프론트엔드 - React" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo =========================================
echo  브라우저 열기: http://localhost:5173
echo  API 문서:     http://localhost:8000/docs
echo =========================================
start http://localhost:5173
