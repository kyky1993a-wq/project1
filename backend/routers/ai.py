import json
import base64

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from services import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/generate")
async def generate(
    keywords: str = Form(...),
    date: str = Form(...),
    provider: str = Form("groq"),
    photos: list[UploadFile] = File(default=[]),
):
    kw_list = json.loads(keywords)
    if not kw_list:
        raise HTTPException(status_code=400, detail="키워드를 하나 이상 입력해주세요.")

    images: list[tuple[str, str]] = []
    for photo in photos:
        data = await photo.read()
        b64 = base64.b64encode(data).decode()
        media_type = photo.content_type or "image/jpeg"
        images.append((b64, media_type))

    try:
        text = await ai_service.generate_diary(kw_list, date, provider, images)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 생성 실패: {str(e)}")
    return {"diary_text": text, "provider_used": provider}
