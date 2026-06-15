import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDiary, generateDiary } from '../api/client'
import PhotoUpload from '../components/PhotoUpload'

export default function Create() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [keywords, setKeywords] = useState('')
  const [provider, setProvider] = useState<'claude' | 'chatgpt' | 'gemini' | 'groq'>('groq')
  const [diaryText, setDiaryText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const kwList = keywords
    .split(/[,，\s]+/)
    .map(k => k.trim())
    .filter(Boolean)

  const handleGenerate = async () => {
    if (kwList.length === 0) {
      setError('키워드를 입력해주세요.')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const result = await generateDiary(kwList, date, provider, photos)
      setDiaryText(result.diary_text)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'AI 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!diaryText.trim()) {
      setError('일기 내용을 입력하거나 AI로 생성해주세요.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const formData = new FormData()
      const dateObj = new Date(date)
      const title = `${dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 일기`
      formData.append('title', title)
      formData.append('date', date)
      formData.append('keywords', JSON.stringify(kwList))
      formData.append('diary_text', diaryText)
      formData.append('ai_provider', provider)
      photos.forEach(photo => formData.append('photos', photo))

      const created = await createDiary(formData)
      navigate(`/diaries/${created.id}`)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-600">
            ← 뒤로
          </button>
          <h1 className="text-xl font-bold text-stone-800">새 일기 쓰기</h1>
        </div>

        <div className="space-y-6">
          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">사진</label>
            <PhotoUpload files={photos} onChange={setPhotos} />
          </div>

          {/* 키워드 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              오늘의 키워드
              <span className="text-stone-400 font-normal ml-1">(쉼표 또는 공백으로 구분)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="예: 웃음, 첫걸음, 이유식"
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            {kwList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kwList.map(kw => (
                  <span key={kw} className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI 제공자 선택 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">AI 선택</label>
            <div className="flex gap-3">
              {([
                { id: 'groq', label: '⚡ Groq', badge: '무료' },
                { id: 'gemini', label: '✨ Gemini', badge: '무료' },
                { id: 'claude', label: '🤖 Claude', badge: '유료' },
                { id: 'chatgpt', label: '💬 ChatGPT', badge: '유료' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors relative ${
                    provider === p.id
                      ? 'border-amber-400 bg-amber-100 text-amber-800'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-amber-200'
                  }`}
                >
                  {p.label}
                  <span className={`absolute -top-1.5 -right-1.5 text-[10px] px-1 rounded-full font-normal ${
                    p.badge === '무료' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                  }`}>{p.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI 생성 버튼 */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || kwList.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-200 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {generating ? '✨ 일기 생성 중...' : '✨ AI 일기 자동 생성'}
          </button>

          {/* 일기 텍스트 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              일기 내용
              <span className="text-stone-400 font-normal ml-1">(직접 수정 가능)</span>
            </label>
            <textarea
              value={diaryText}
              onChange={e => setDiaryText(e.target.value)}
              rows={8}
              placeholder="AI로 생성하거나 직접 작성해주세요..."
              className="w-full border border-amber-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
            />
          </div>

          {/* 오류 메시지 */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* 저장 버튼 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !diaryText.trim()}
            className="w-full bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {saving ? '저장 중...' : '💾 일기 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
