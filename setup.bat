@echo off
title 육아 자동 일기 - 최초 설치

echo =========================================
echo   최초 설치 시작
echo =========================================
echo.

REM Node.js PATH 설정 (scoop 설치)
set PATH=%USERPROFILE%\scoop\apps\nodejs\current;%USERPROFILE%\scoop\shims;%PATH%

REM ---- 백엔드 ----
echo [백엔드] Python 가상환경 생성...
cd /d %~dp0backend
python -m venv venv
call venv\Scripts\activate

echo [백엔드] 패키지 설치...
pip install -r requirements.txt

REM ---- PostgreSQL DB 생성 ----
echo.
echo [DB] 'diary_db' 데이터베이스 생성 (PostgreSQL이 실행 중이어야 합니다)
echo 비밀번호를 물어보면 PostgreSQL 비밀번호를 입력하세요.
psql -U postgres -c "CREATE DATABASE diary_db;" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] DB 생성 실패 또는 이미 존재합니다. 계속 진행합니다.
)

REM ---- 프론트엔드 ----
echo.
echo [프론트엔드] 패키지 설치...
cd /d %~dp0frontend
npm install

echo.
echo =========================================
echo  설치 완료!
echo  .env 파일에 API 키를 입력한 후
echo  run.bat 을 실행하세요.
echo =========================================
pause
