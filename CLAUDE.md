# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

육아 자동 일기 앱. FastAPI 백엔드 + React(Vite) 프론트엔드 단일 서비스로 배포.

## 개발 환경 실행

**전제조건**: PostgreSQL이 먼저 실행돼야 함 (scoop 설치 기준)

```powershell
# 1. PostgreSQL 시작
& "C:\Users\user\scoop\apps\postgresql\current\bin\pg_ctl.exe" -D "C:\Users\user\scoop\persist\postgresql\data" -l "C:\Users\user\scoop\persist\postgresql\data\server.log" start

# 2. 백엔드 실행 (포트 8000)
cd backend && venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000

# 3. 프론트엔드 실행 (포트 5173)
cd frontend && npm run dev
```

`run.bat` 실행으로 2, 3 단계 자동화 가능.

- 로컬 DB: `postgresql+asyncpg://postgres:postgres@localhost:5432/diary_db` (trust 인증, 비밀번호 불필요)
- Python: `backend/venv/` 가상환경 사용 (Python 3.14)
- Node: scoop 설치 기준 `%USERPROFILE%\scoop\apps\nodejs\current`

## 아키텍처

### 서비스 구조

```
/ (프론트엔드 React SPA, 빌드 시 FastAPI가 정적 서빙)
/api/*   → FastAPI 라우터
/static/photos/* → 업로드된 사진 파일 (PHOTOS_DIR 환경변수 경로)
```

개발 시 Vite가 `/api`, `/static`을 `localhost:8000`으로 프록시. 프로덕션은 FastAPI 단일 프로세스가 모두 서빙 (`main.py` 마지막 `StaticFiles` 마운트).

### 백엔드 (`backend/`)

- `main.py` — FastAPI 앱, CORS, 정적 파일 마운트, lifespan(DB 초기화 + 사진 디렉토리 생성)
- `config.py` — `pydantic-settings` 기반 환경변수. `get_settings()`는 `@lru_cache`. Render의 `postgres://` URL을 `postgresql+asyncpg://`로 자동 변환하는 validator 포함
- `database.py` — SQLAlchemy 2.0 async 엔진. `init_db()`로 테이블 자동 생성 (Alembic 미사용)
- `models.py` — `Diary`, `Photo`, `OneDriveSync` 3개 테이블. `keywords`는 JSON 문자열로 저장
- `routers/ai.py` — `/api/ai/generate` (multipart form). `keywords`는 JSON 문자열 필드
- `routers/diaries.py` — `_photo_url(file_path)`: `PHOTOS_BASE_URL + diary_id + filename` 조합으로 URL 생성
- `services/ai_service.py` — 4개 AI 제공자 지원. 이미지 있으면 Vision 모델 사용 (Groq: `meta-llama/llama-4-scout-17b-16e-instruct`, 없으면 `llama-3.3-70b-versatile`)

### 프론트엔드 (`frontend/src/`)

- `api/client.ts` — axios baseURL `/api`. `generateDiary()`는 항상 FormData 전송 (이미지 포함 가능)
- `pages/Create.tsx` — AI 생성 시 현재 선택된 `photos` state(File[])를 그대로 전달. 사진은 저장 전까지 클라이언트 메모리에만 존재
- `components/KakaoShareButton.tsx` — Kakao JS SDK 2.7.2 사용. `link.webUrl`은 `window.location.origin` 사용 (도메인 불일치 방지)

## 배포 (Render)

- `render.yaml` — Blueprint: Web Service(`diary-app`) + PostgreSQL(`diary-db`) + Disk(`/var/data/photos`, 1GB)
- 빌드: `pip install -r backend/requirements.txt && npm --prefix frontend install && npm --prefix frontend run build`
- 시작: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Render의 `DATABASE_URL`(`postgres://`)은 `config.py` validator가 자동 변환
- 배포 URL: `https://diary-app-8kin.onrender.com`

### 필수 환경변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Render가 자동 주입 |
| `PHOTOS_DIR` | `/var/data/photos` (Disk 마운트 경로) |
| `PHOTOS_BASE_URL` | `https://diary-app-8kin.onrender.com/static/photos` |
| `ALLOWED_ORIGINS` | `https://diary-app-8kin.onrender.com` |
| `GROQ_API_KEY` | 기본 AI 제공자 |
| `KAKAO_JS_KEY` | 카카오 공유 기능 |

## 주요 제약사항

- **사진 영구 저장**: Render Disk(`/var/data/photos`) 필수. `/tmp` 사용 시 재시작마다 초기화됨
- **카카오 공유**: [developers.kakao.com](https://developers.kakao.com)에서 배포 도메인을 웹 플랫폼에 등록 필요
- **Groq Vision**: 사진 첨부 시 `meta-llama/llama-4-scout-17b-16e-instruct` 자동 사용 (`llama-3.2-11b-vision-preview`는 폐기됨)
- **AI 생성 엔드포인트**: JSON body 아닌 multipart form. `keywords`는 JSON 배열 문자열로 전송
