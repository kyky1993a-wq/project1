import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSettings,
  pollOneDriveAuth,
  startOneDriveAuth,
  updateSettings,
} from '../api/client'
import type { AppSettings } from '../types'

export default function Settings() {
  const navigate = useNavigate()
  const [childName, setChildName] = useState('')
  const [provider, setProvider] = useState<'claude' | 'chatgpt' | 'gemini' | 'groq'>('groq')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // OneDrive
  const [odCode, setOdCode] = useState('')
  const [odUrl, setOdUrl] = useState('')
  const [odPolling, setOdPolling] = useState(false)
  const [odAuthenticated, setOdAuthenticated] = useState(false)
  const pollRef = useRef<any>(null)

  useEffect(() => {
    getSettings().then((s: AppSettings) => {
      setChildName(s.child_name)
      setProvider(s.default_ai_provider as 'claude' | 'chatgpt' | 'gemini' | 'groq')
      setOdAuthenticated(s.onedrive_authenticated)
    })
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    setMsg('')
    try {
      await updateSettings({ default_ai_provider: provider, child_name: childName })
      setMsg('설정이 저장되었습니다. (AI 제공자 변경은 서버 재시작 후 적용)')
    } catch {
      setMsg('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleStartOneDrive = async () => {
    try {
      const data = await startOneDriveAuth()
      setOdCode(data.user_code)
      setOdUrl(data.verification_uri)
      setOdPolling(true)

      pollRef.current = setInterval(async () => {
        try {
          const result = await pollOneDriveAuth()
          if (result.authenticated) {
            clearInterval(pollRef.current)
            setOdPolling(false)
            setOdAuthenticated(true)
            setOdCode('')
            setOdUrl('')
          }
        } catch {
          clearInterval(pollRef.current)
          setOdPolling(false)
        }
      }, 5000)
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? 'OneDrive 인증 시작 실패')
    }
  }

  return (
    <div className="min-h-screen bg-amber-50/30 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-600 text-sm">
            ← 뒤로
          </button>
          <h1 className="text-xl font-bold text-stone-800">⚙️ 설정</h1>
        </div>

        <div className="space-y-6">
          {/* 기본 설정 */}
          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-stone-700">기본 설정</h2>

            <div>
              <label className="block text-sm text-stone-600 mb-1">아이 이름/호칭</label>
              <input
                value={childName}
                onChange={e => setChildName(e.target.value)}
                placeholder="예: 민준이, 아이"
                className="w-full border border-amber-200 rounded-xl px-4 py-2.5 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-600 mb-1">기본 AI</label>
              <div className="flex gap-3">
                {([
                  { id: 'groq', label: '⚡ Groq', badge: '무료' },
                  { id: 'gemini', label: '✨ Gemini', badge: '무료' },
                  { id: 'claude', label: '🤖 Claude', badge: '유료' },
                  { id: 'chatgpt', label: '💬 ChatGPT', badge: '유료' },
                ] as const).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors relative ${
                      provider === p.id
                        ? 'border-amber-400 bg-amber-100 text-amber-800'
                        : 'border-stone-200 bg-white text-stone-500'
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

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-200 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {saving ? '저장 중...' : '설정 저장'}
            </button>
            {msg && <p className="text-sm text-stone-500">{msg}</p>}
          </div>

          {/* OneDrive 인증 */}
          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-stone-700">☁ OneDrive 연동</h2>

            {odAuthenticated ? (
              <div className="flex items-center gap-2 text-blue-600">
                <span>✅</span>
                <span className="text-sm">OneDrive 연결됨</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-stone-500">
                  일기를 OneDrive에 자동 저장하려면 Microsoft 계정으로 인증하세요.
                </p>
                <button
                  onClick={handleStartOneDrive}
                  disabled={odPolling}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-blue-200 text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  {odPolling ? '인증 대기 중...' : 'OneDrive 연결하기'}
                </button>

                {odCode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-stone-700">
                      아래 코드를 브라우저에서 입력해주세요:
                    </p>
                    <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">
                      {odCode}
                    </p>
                    <a
                      href={odUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-sm text-blue-600 underline"
                    >
                      인증 페이지 열기 →
                    </a>
                    <p className="text-xs text-stone-400">인증 완료 후 자동으로 연결됩니다.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* API 키 안내 */}
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 text-sm text-stone-500 space-y-2">
            <h2 className="font-semibold text-stone-600">🔑 API 키 설정 방법</h2>
            <p>프로젝트 루트의 <code className="bg-stone-200 px-1 rounded">.env</code> 파일을 편집하세요.</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Groq (무료): <code className="bg-stone-200 px-1 rounded">GROQ_API_KEY</code> — console.groq.com</li>
              <li>Gemini (무료): <code className="bg-stone-200 px-1 rounded">GEMINI_API_KEY</code> — aistudio.google.com</li>
              <li>Claude: <code className="bg-stone-200 px-1 rounded">ANTHROPIC_API_KEY</code></li>
              <li>ChatGPT: <code className="bg-stone-200 px-1 rounded">OPENAI_API_KEY</code></li>
              <li>카카오 공유: <code className="bg-stone-200 px-1 rounded">KAKAO_JS_KEY</code></li>
              <li>OneDrive: <code className="bg-stone-200 px-1 rounded">MICROSOFT_CLIENT_ID</code></li>
            </ul>
            <p className="text-xs">변경 후 서버를 재시작해야 적용됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
