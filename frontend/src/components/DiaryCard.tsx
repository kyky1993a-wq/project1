import { useNavigate } from 'react-router-dom'
import type { DiaryListItem } from '../types'

interface Props {
  diary: DiaryListItem
}

const syncBadge: Record<string, { label: string; color: string }> = {
  synced: { label: '☁ OneDrive', color: 'bg-blue-100 text-blue-700' },
  failed: { label: '⚠ 동기화 실패', color: 'bg-red-100 text-red-600' },
  pending: { label: '⏳ 동기화 중', color: 'bg-yellow-100 text-yellow-700' },
  none: { label: '', color: '' },
}

export default function DiaryCard({ diary }: Props) {
  const navigate = useNavigate()
  const badge = syncBadge[diary.onedrive_status]
  const dateFormatted = new Date(diary.date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div
      onClick={() => navigate(`/diaries/${diary.id}`)}
      className="cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-amber-100"
    >
      {/* 썸네일 */}
      <div className="w-full h-48 bg-amber-50 flex items-center justify-center overflow-hidden">
        {diary.thumbnail_url ? (
          <img src={diary.thumbnail_url} alt="썸네일" className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">📔</span>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4">
        <p className="text-xs text-amber-600 font-medium mb-1">{dateFormatted}</p>
        <h3 className="font-semibold text-base text-stone-800 mb-2 line-clamp-1">{diary.title}</h3>
        <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{diary.diary_text}</p>

        {/* 키워드 태그 */}
        <div className="flex flex-wrap gap-1 mt-3">
          {diary.keywords.slice(0, 3).map(kw => (
            <span key={kw} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {kw}
            </span>
          ))}
        </div>

        {/* OneDrive 배지 */}
        {badge.label && (
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}
