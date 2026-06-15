from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import init_db
from routers import ai, diaries, onedrive, settings as settings_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    photos_dir = Path(settings.PHOTOS_DIR)
    photos_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="육아 자동 일기 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 사진 정적 파일 서빙 — 로컬/서버 모두 동일하게 동작
photos_dir = Path(settings.PHOTOS_DIR)
photos_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/photos", StaticFiles(directory=str(photos_dir)), name="photos")

app.include_router(diaries.router)
app.include_router(ai.router)
app.include_router(onedrive.router)
app.include_router(settings_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# 빌드된 프론트엔드 정적 파일 서빙 (Render 배포용)
_FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")
