import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteDiary, getDiary, syncToOneDrive } from '../api/client'
import KakaoShareButton from '../components/KakaoShareButton'
import type { Diary } from '../types'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [diary, setDiary] = useState<Diary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string>('none')

  useEffect(() => {
    if (!id) return
    getDiary(Number(id))
      .then((d: Diary) => {
        setDiary(d)
        setSyncStatus(d.onedrive_status)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('이 일기를 삭제할까요?')) return
    await deleteDiary(Number(id))
    navigate('/')
  }

  const handleSync = async () => {
    if (!diary) return
    setSyncing(true)
    try {
      await syncToOneDrive(diary.id)
      setSyncStatus('synced')
      alert('OneDrive에 저장되었습니다!')
    } catch (e: any) {
      setSyncStatus('failed')
      alert(e?.response?.data?.detail ?? 'OneDrive 동기화 실패')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-amber-50/30 flex items-center justify-center text-stone-400">불러오는 중...</div>
  if (!diary) return null

  const dateFormatted = new Date(diary.date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const syncBadgeMap: Record<string, { label: string; color: string }> = {
    synced: { label: '☁ OneDrive 저장됨', color: 'bg-blue-100 text-blue-700' },
    failed: { label: '⚠ 동기화 실패', color: 'bg-red-100 text-red-600' },
    pending: { label: '⏳ 동기화 중', color: 'bg-yellow-100 text-yellow-700' },
    none: { label: '', color: '' },
  }
  const badge = syncBadgeMap[syncStatus]

  return (
    <div className="min-h-screen bg-amber-50/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-600 text-sm">
            ← 목록으로
          </button>
          <button onClick={handleDelete} className="text-red-400 hover:text-red-600 text-sm">
            삭제
          </button>
        </div>

        {/* 날짜 + 제목 */}
        <div className="mb-6">
          <p className="text-amber-600 text-sm font-medium">{dateFormatted}</p>
          <h1 className="text-2xl font-bold text-stone-800 mt-1">{diary.title}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {diary.keywords.map(kw => (
              <span key={kw} className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* 사진 갤러리 */}
        {diary.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {diary.photos.map(photo => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo.url)}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img src={photo.url} alt={photo.original_name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* 일기 본문 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100 mb-6">
          <p className="text-stone-700 leading-relaxed whitespace-pre-line">{diary.diary_text}</p>
          <p className="text-xs text-stone-300 mt-4 text-right">
            작성: {diary.ai_provider === 'claude' ? 'Claude' : 'ChatGPT'}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-3 items-center">
          <KakaoShareButton
            date={diary.date}
            diaryText={diary.diary_text}
            title={diary.title}
            photos={diary.photos.map(p => p.url)}
          />

          <button
            onClick={handleSync}
            disabled={syncing || syncStatus === 'synced'}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-200 text-white font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <span>☁</span>
            <span>{syncing ? '저장 중...' : 'OneDrive 저장'}</span>
          </button>

          {badge.label && (
            <span className={`text-xs px-2.5 py-1 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* 사진 라이트박스 */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="원본 크기"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-amber-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
