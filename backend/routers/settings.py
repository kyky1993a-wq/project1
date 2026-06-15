from pathlib import Path
from fastapi import APIRouter
from schemas import SettingsOut, SettingsUpdate
from config import get_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])
settings = get_settings()


@router.get("", response_model=SettingsOut)
async def get_app_settings():
    return SettingsOut(
        default_ai_provider=settings.DEFAULT_AI_PROVIDER,
        child_name=settings.CHILD_NAME,
        kakao_js_key=settings.KAKAO_JS_KEY,
        onedrive_authenticated=bool(settings.ONEDRIVE_ACCESS_TOKEN),
        photos_base_url=settings.PHOTOS_BASE_URL,
    )


@router.post("", response_model=SettingsOut)
async def update_app_settings(body: SettingsUpdate):
    env_path = Path(".env")
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()
    else:
        lines = []

    def set_var(key: str, value: str, lines: list[str]) -> list[str]:
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={value}"
                return lines
        lines.append(f"{key}={value}")
        return lines

    if body.default_ai_provider is not None:
        lines = set_var("DEFAULT_AI_PROVIDER", body.default_ai_provider, lines)
    if body.child_name is not None:
        lines = set_var("CHILD_NAME", body.child_name, lines)

    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # 반영된 값을 응답 (재시작 전까지 메모리에는 반영 안 됨을 프론트에서 안내)
    from config import Settings
    updated = Settings(_env_file=".env")
    return SettingsOut(
        default_ai_provider=updated.DEFAULT_AI_PROVIDER,
        child_name=updated.CHILD_NAME,
        kakao_js_key=updated.KAKAO_JS_KEY,
        onedrive_authenticated=bool(updated.ONEDRIVE_ACCESS_TOKEN),
        photos_base_url=updated.PHOTOS_BASE_URL,
    )
