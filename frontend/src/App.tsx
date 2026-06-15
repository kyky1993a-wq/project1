import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Create from './pages/Create'
import Detail from './pages/Detail'
import Settings from './pages/Settings'

function NavBar() {
  const navigate = useNavigate()
  return (
    <nav className="bg-white border-b border-amber-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <button
        onClick={() => navigate('/')}
        className="font-bold text-amber-600 text-lg"
      >
        📔 육아 일기
      </button>
      <button
        onClick={() => navigate('/settings')}
        className="text-stone-400 hover:text-stone-600 text-sm"
      >
        ⚙️ 설정
      </button>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/diaries/:id" element={<Detail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
