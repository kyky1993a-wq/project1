import anthropic
import openai
import httpx
from groq import AsyncGroq
from config import get_settings

settings = get_settings()

Images = list[tuple[str, str]]  # [(base64, media_type), ...]


def _build_prompt(keywords: list[str], date_str: str, child_name: str, has_images: bool = False) -> str:
    image_line = (
        "\n사진 활용: 첨부된 사진 속 아이의 모습, 표정, 활동, 배경 등을 일기에 자연스럽게 녹여주세요.\n"
        if has_images else ""
    )
    return f"""당신은 따뜻하고 감성적인 육아 일기를 작성하는 도우미입니다.
다음 정보를 바탕으로 한국어로 육아 일기를 작성해주세요.

날짜: {date_str}
아이 이름/호칭: {child_name}
오늘의 키워드: {', '.join(keywords)}
{image_line}
작성 규칙:
- 200~300자 분량
- 1인칭 부모 시점 (예: "오늘 우리 {child_name}가...")
- 키워드를 자연스럽게 문장 속에 녹여서 사용
- 따뜻하고 감성적인 문체
- 마지막 문장은 아이에 대한 사랑이나 감사의 표현으로 마무리
- 날짜나 키워드 목록을 그대로 나열하지 말 것

일기만 출력하세요. 제목, 설명, 부연 설명 없이 일기 본문만."""


async def generate_diary(
    keywords: list[str], date_str: str, provider: str, images: Images = []
) -> str:
    child_name = settings.CHILD_NAME
    prompt = _build_prompt(keywords, date_str, child_name, has_images=bool(images))

    if provider == "claude":
        return await _generate_with_claude(prompt, images)
    elif provider == "gemini":
        return await _generate_with_gemini(prompt, images)
    elif provider == "groq":
        return await _generate_with_groq(prompt, images)
    return await _generate_with_chatgpt(prompt, images)


async def _generate_with_gemini(prompt: str, images: Images = []) -> str:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
    key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL
    headers = {"Authorization": f"Bearer {key}"} if key.startswith("AQ.") else {"x-goog-api-key": key}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    parts = []
    for b64, media_type in images:
        parts.append({"inline_data": {"mime_type": media_type, "data": b64}})
    parts.append({"text": prompt})

    payload = {"contents": [{"parts": parts}]}
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


async def _generate_with_groq(prompt: str, images: Images = []) -> str:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    model = "meta-llama/llama-4-scout-17b-16e-instruct" if images else "llama-3.3-70b-versatile"

    content: list = [
        {"type": "image_url", "image_url": {"url": f"data:{mt};base64,{b64}"}}
        for b64, mt in images
    ]
    content.append({"type": "text", "text": prompt})

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        max_tokens=1024,
    )
    return response.choices[0].message.content


async def _generate_with_claude(prompt: str, images: Images = []) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    content: list = [
        {"type": "image", "source": {"type": "base64", "media_type": mt, "data": b64}}
        for b64, mt in images
    ]
    content.append({"type": "text", "text": prompt})

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
    )
    return message.content[0].text


async def _generate_with_chatgpt(prompt: str, images: Images = []) -> str:
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    content: list = [
        {"type": "image_url", "image_url": {"url": f"data:{mt};base64,{b64}"}}
        for b64, mt in images
    ]
    content.append({"type": "text", "text": prompt})

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": content}],
        max_tokens=1024,
    )
    return response.choices[0].message.content
