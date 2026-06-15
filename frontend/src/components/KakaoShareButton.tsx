import { useEffect, useState } from 'react'
import { getSettings } from '../api/client'

interface Props {
  date: string
  diaryText: string
  title?: string
  photos?: string[]
}

declare global {
  interface Window {
    Kakao: any
  }
}

export default function KakaoShareButton({ date, diaryText, title, photos = [] }: Props) {
  const [ready, setReady] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    getSettings().then((s: any) => {
      if (!s.kakao_js_key) return
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(s.kakao_js_key)
      }
      setReady(true)
    })
  }, [])

  const handleShare = async () => {
    if (!ready || !window.Kakao?.isInitialized()) {
      alert('카카오 공유 기능을 사용하려면 KAKAO_JS_KEY가 필요합니다.\n\n발급 방법:\n1. developers.kakao.com 접속\n2. 앱 만들기 → JavaScript 키 복사\n3. .env 파일의 KAKAO_JS_KEY에 입력 후 서버 재시작')
      return
    }

    const dateFormatted = new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const preview = diaryText.length > 150 ? diaryText.slice(0, 150) + '...' : diaryText
    const shareTitle = title ?? `${dateFormatted} 육아일기`

    setSharing(true)
    try {
      if (photos.length > 0) {
        // 첫 번째 사진을 Kakao 서버에 업로드 후 피드로 공유
        // 절대 URL → 상대 경로로 변환 (Vite 프록시 경유, CORS 우회)
        const relativeUrl = photos[0].replace(/^https?:\/\/[^/]+/, '')
        const blob = await fetch(relativeUrl).then(r => r.blob())
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const file = new File([blob], `photo.${ext}`, { type: blob.type })

        const uploaded = await window.Kakao.Share.uploadImage({ file: [file] })
        const imageUrl = uploaded.infos.original.url

        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareTitle,
            description: preview,
            imageUrl,
            link: {
              mobileWebUrl: 'https://kakao.com',
              webUrl: 'https://kakao.com',
            },
          },
        })
      } else {
        // 사진 없으면 텍스트로만 공유
        window.Kakao.Share.sendDefault({
          objectType: 'text',
          text: `📔 ${dateFormatted} 육아일기\n\n${preview}`,
          link: {
            mobileWebUrl: 'https://kakao.com',
            webUrl: 'https://kakao.com',
          },
        })
      }
    } catch (e: any) {
      alert('공유 중 오류가 발생했습니다: ' + (e?.message ?? String(e)))
    } finally {
      setSharing(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-200 text-stone-800 font-medium px-4 py-2 rounded-xl transition-colors"
    >
      <span>💬</span>
      <span>{sharing ? '공유 준비 중...' : '카카오톡 공유'}</span>
    </button>
  )
}
