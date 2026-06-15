import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDiaries } from '../api/client'
import DiaryCard from '../components/DiaryCard'
import type { DiaryListItem } from '../types'

export default function Home() {
  const [diaries, setDiaries] = useState<DiaryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDiaries()
      .then(setDiaries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-amber-50/30 p-4 md:p-8">
      {/* 헤더 */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">📔 육아 일기</h1>
            <p className="text-stone-500 text-sm mt-1">소중한 순간을 기록해보세요</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="bg-amber-500 hover:bg-amber-400 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            + 새 일기 쓰기
          </button>
        </div>

        {/* 일기 목록 */}
        {loading ? (
          <div className="text-center py-20 text-stone-400">불러오는 중...</div>
        ) : diaries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-stone-500">아직 일기가 없어요.</p>
            <p className="text-stone-400 text-sm mt-1">첫 번째 일기를 써보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {diaries.map(diary => (
              <DiaryCard key={diary.id} diary={diary} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
