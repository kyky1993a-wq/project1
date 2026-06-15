import asyncio
import json
from datetime import datetime
from pathlib import Path
import httpx
from config import get_settings

settings = get_settings()

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0"
SCOPES = "Files.ReadWrite offline_access"

# 인증 중 device code를 임시 보관
_device_code_store: dict = {}


async def start_device_code_flow() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TOKEN_URL}/devicecode",
            data={
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "scope": SCOPES,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        _device_code_store["device_code"] = data["device_code"]
        _device_code_store["interval"] = data.get("interval", 5)
        return {
            "user_code": data["user_code"],
            "verification_uri": data["verification_uri"],
            "expires_in": data["expires_in"],
            "message": data.get("message", ""),
        }


async def poll_device_code() -> dict:
    device_code = _device_code_store.get("device_code")
    if not device_code:
        return {"authenticated": False, "message": "인증 흐름이 시작되지 않았습니다."}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TOKEN_URL}/token",
            data={
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "device_code": device_code,
            },
        )
        data = resp.json()

    if "access_token" in data:
        _persist_tokens(data["access_token"], data.get("refresh_token", ""))
        _device_code_store.clear()
        return {"authenticated": True, "message": "OneDrive 인증 완료"}

    error = data.get("error", "")
    if error == "authorization_pending":
        return {"authenticated": False, "message": "인증 대기 중..."}
    return {"authenticated": False, "message": f"인증 실패: {error}"}


def _persist_tokens(access_token: str, refresh_token: str):
    """토큰을 .env 파일에 저장 (서버 재시작 후에도 유지)"""
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

    lines = set_var("ONEDRIVE_ACCESS_TOKEN", access_token, lines)
    lines = set_var("ONEDRIVE_REFRESH_TOKEN", refresh_token, lines)
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


async def _get_valid_token() -> str:
    token = settings.ONEDRIVE_ACCESS_TOKEN
    if not token:
        raise ValueError("OneDrive 인증이 필요합니다.")
    return token


async def upload_diary(diary_id: int, date_str: str, diary_text: str, photo_paths: list[str]) -> str:
    token = await _get_valid_token()
    headers = {"Authorization": f"Bearer {token}"}
    folder_path = f"육아일기/{date_str}"

    async with httpx.AsyncClient() as client:
        # 텍스트 파일 업로드
        text_bytes = diary_text.encode("utf-8")
        await client.put(
            f"{GRAPH_BASE}/me/drive/root:/{folder_path}/일기.txt:/content",
            headers={**headers, "Content-Type": "text/plain; charset=utf-8"},
            content=text_bytes,
        )

        # 사진 업로드
        for path_str in photo_paths:
            path = Path(path_str)
            if not path.exists():
                continue
            with open(path, "rb") as f:
                photo_bytes = f.read()
            await client.put(
                f"{GRAPH_BASE}/me/drive/root:/{folder_path}/{path.name}:/content",
                headers={**headers, "Content-Type": "image/jpeg"},
                content=photo_bytes,
            )

    return folder_path
