import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import get_settings
from database import get_db
from models import Diary, OneDriveSync
from schemas import OneDriveDeviceCodeResponse, OneDrivePollResponse, OneDriveSyncResponse
from services import onedrive_service

router = APIRouter(prefix="/api/onedrive", tags=["onedrive"])
settings = get_settings()


@router.get("/auth/start", response_model=OneDriveDeviceCodeResponse)
async def auth_start():
    if not settings.MICROSOFT_CLIENT_ID:
        raise HTTPException(status_code=400, detail="MICROSOFT_CLIENT_ID가 설정되지 않았습니다.")
    try:
        data = await onedrive_service.start_device_code_flow()
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OneDrive 인증 시작 실패: {str(e)}")


@router.get("/auth/poll", response_model=OneDrivePollResponse)
async def auth_poll():
    try:
        result = await onedrive_service.poll_device_code()
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"폴링 실패: {str(e)}")


@router.get("/auth/status")
async def auth_status():
    return {"authenticated": bool(settings.ONEDRIVE_ACCESS_TOKEN)}


@router.post("/sync/{diary_id}", response_model=OneDriveSyncResponse)
async def sync_diary(diary_id: int, db: AsyncSession = Depends(get_db)):
    if not settings.ONEDRIVE_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="OneDrive 인증이 필요합니다.")

    result = await db.execute(
        select(Diary)
        .options(selectinload(Diary.photos), selectinload(Diary.onedrive_sync))
        .where(Diary.id == diary_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")

    date_str = diary.date.strftime("%Y-%m-%d")
    photo_paths = [p.file_path for p in diary.photos]

    try:
        folder_path = await onedrive_service.upload_diary(
            diary_id=diary.id,
            date_str=date_str,
            diary_text=diary.diary_text,
            photo_paths=photo_paths,
        )
    except Exception as e:
        if diary.onedrive_sync:
            diary.onedrive_sync.status = "failed"
        else:
            db.add(OneDriveSync(diary_id=diary.id, status="failed"))
        await db.commit()
        raise HTTPException(status_code=502, detail=f"OneDrive 업로드 실패: {str(e)}")

    from datetime import datetime
    if diary.onedrive_sync:
        diary.onedrive_sync.status = "synced"
        diary.onedrive_sync.synced_at = datetime.utcnow()
        diary.onedrive_sync.onedrive_folder_id = folder_path
    else:
        db.add(OneDriveSync(
            diary_id=diary.id,
            status="synced",
            synced_at=datetime.utcnow(),
            onedrive_folder_id=folder_path,
        ))
    await db.commit()
    return OneDriveSyncResponse(status="synced", message=f"OneDrive/{folder_path} 에 저장되었습니다.")
