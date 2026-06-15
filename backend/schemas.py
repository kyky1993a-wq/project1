from datetime import datetime, date
from pydantic import BaseModel


# --- Photo ---
class PhotoOut(BaseModel):
    id: int
    filename: str
    original_name: str
    url: str
    upload_order: int

    model_config = {"from_attributes": True}


# --- Diary ---
class DiaryCreate(BaseModel):
    title: str
    date: date
    keywords: list[str]
    diary_text: str
    ai_provider: str = "claude"


class DiaryOut(BaseModel):
    id: int
    title: str
    date: date
    keywords: list[str]
    diary_text: str
    ai_provider: str
    created_at: datetime
    photos: list[PhotoOut] = []
    onedrive_status: str = "none"

    model_config = {"from_attributes": True}


class DiaryListItem(BaseModel):
    id: int
    title: str
    date: date
    keywords: list[str]
    diary_text: str
    created_at: datetime
    thumbnail_url: str | None = None
    onedrive_status: str = "none"

    model_config = {"from_attributes": True}


# --- AI ---
class AIGenerateRequest(BaseModel):
    keywords: list[str]
    date: str
    provider: str = "claude"


class AIGenerateResponse(BaseModel):
    diary_text: str
    provider_used: str


# --- Settings ---
class SettingsOut(BaseModel):
    default_ai_provider: str
    child_name: str
    kakao_js_key: str
    onedrive_authenticated: bool
    photos_base_url: str


class SettingsUpdate(BaseModel):
    default_ai_provider: str | None = None
    child_name: str | None = None


# --- OneDrive ---
class OneDriveDeviceCodeResponse(BaseModel):
    user_code: str
    verification_uri: str
    expires_in: int
    message: str


class OneDrivePollResponse(BaseModel):
    authenticated: bool
    message: str


class OneDriveSyncResponse(BaseModel):
    status: str
    message: str
