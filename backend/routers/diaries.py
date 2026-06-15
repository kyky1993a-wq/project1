import json
import uuid
from pathlib import Path
from datetime import date as date_type

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import get_settings
from database import get_db
from models import Diary, OneDriveSync, Photo
from schemas import DiaryListItem, DiaryOut, PhotoOut

router = APIRouter(prefix="/api/diaries", tags=["diaries"])
settings = get_settings()


def _photo_url(file_path: str) -> str:
    filename = Path(file_path).name
    diary_id = Path(file_path).parent.name
    return f"{settings.PHOTOS_BASE_URL}/{diary_id}/{filename}"


def _build_diary_out(diary: Diary) -> DiaryOut:
    photos = [
        PhotoOut(
            id=p.id,
            filename=p.filename,
            original_name=p.original_name,
            url=_photo_url(p.file_path),
            upload_order=p.upload_order,
        )
        for p in diary.photos
    ]
    sync_status = "none"
    if diary.onedrive_sync:
        sync_status = diary.onedrive_sync.status

    return DiaryOut(
        id=diary.id,
        title=diary.title,
        date=diary.date,
        keywords=json.loads(diary.keywords),
        diary_text=diary.diary_text,
        ai_provider=diary.ai_provider,
        created_at=diary.created_at,
        photos=photos,
        onedrive_status=sync_status,
    )


@router.get("", response_model=list[DiaryListItem])
async def list_diaries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Diary)
        .options(selectinload(Diary.photos), selectinload(Diary.onedrive_sync))
        .order_by(desc(Diary.date), desc(Diary.created_at))
    )
    diaries = result.scalars().all()

    items = []
    for d in diaries:
        thumbnail = _photo_url(d.photos[0].file_path) if d.photos else None
        sync_status = d.onedrive_sync.status if d.onedrive_sync else "none"
        items.append(
            DiaryListItem(
                id=d.id,
                title=d.title,
                date=d.date,
                keywords=json.loads(d.keywords),
                diary_text=d.diary_text,
                created_at=d.created_at,
                thumbnail_url=thumbnail,
                onedrive_status=sync_status,
            )
        )
    return items


@router.get("/{diary_id}", response_model=DiaryOut)
async def get_diary(diary_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Diary)
        .options(selectinload(Diary.photos), selectinload(Diary.onedrive_sync))
        .where(Diary.id == diary_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    return _build_diary_out(diary)


@router.post("", response_model=DiaryOut, status_code=201)
async def create_diary(
    title: str = Form(...),
    date: date_type = Form(...),
    keywords: str = Form(...),      # JSON 배열 문자열
    diary_text: str = Form(...),
    ai_provider: str = Form("claude"),
    photos: list[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
):
    diary = Diary(
        title=title,
        date=date,
        keywords=keywords,
        diary_text=diary_text,
        ai_provider=ai_provider,
    )
    db.add(diary)
    await db.flush()  # id 확보

    photos_dir = Path(settings.PHOTOS_DIR) / str(diary.id)
    photos_dir.mkdir(parents=True, exist_ok=True)

    for order, upload in enumerate(photos):
        if not upload.filename:
            continue
        ext = Path(upload.filename).suffix.lower()
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = photos_dir / unique_name

        async with aiofiles.open(file_path, "wb") as f:
            content = await upload.read()
            await f.write(content)

        photo = Photo(
            diary_id=diary.id,
            filename=unique_name,
            original_name=upload.filename,
            file_path=str(file_path),
            upload_order=order,
        )
        db.add(photo)

    await db.commit()
    await db.refresh(diary)

    result = await db.execute(
        select(Diary)
        .options(selectinload(Diary.photos), selectinload(Diary.onedrive_sync))
        .where(Diary.id == diary.id)
    )
    diary = result.scalar_one()
    return _build_diary_out(diary)


@router.delete("/{diary_id}", status_code=204)
async def delete_diary(diary_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Diary).options(selectinload(Diary.photos)).where(Diary.id == diary_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")

    # 사진 파일 삭제
    for photo in diary.photos:
        p = Path(photo.file_path)
        if p.exists():
            p.unlink()
    # 폴더 삭제 (비어있을 때)
    photos_dir = Path(settings.PHOTOS_DIR) / str(diary_id)
    if photos_dir.exists():
        try:
            photos_dir.rmdir()
        except OSError:
            pass

    await db.delete(diary)
    await db.commit()
