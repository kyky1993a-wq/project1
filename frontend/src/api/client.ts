import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

export default api

// --- Diaries ---
export const getDiaries = () => api.get('/diaries').then(r => r.data)
export const getDiary = (id: number) => api.get(`/diaries/${id}`).then(r => r.data)
export const deleteDiary = (id: number) => api.delete(`/diaries/${id}`)

export const createDiary = (formData: FormData) =>
  api.post('/diaries', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

// --- AI ---
export const generateDiary = (keywords: string[], date: string, provider: string, photos: File[] = []) => {
  const formData = new FormData()
  formData.append('keywords', JSON.stringify(keywords))
  formData.append('date', date)
  formData.append('provider', provider)
  photos.forEach(photo => formData.append('photos', photo))
  return api.post('/ai/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// --- Settings ---
export const getSettings = () => api.get('/settings').then(r => r.data)
export const updateSettings = (data: { default_ai_provider?: string; child_name?: string }) =>
  api.post('/settings', data).then(r => r.data)

// --- OneDrive ---
export const startOneDriveAuth = () => api.get('/onedrive/auth/start').then(r => r.data)
export const pollOneDriveAuth = () => api.get('/onedrive/auth/poll').then(r => r.data)
export const getOneDriveStatus = () => api.get('/onedrive/auth/status').then(r => r.data)
export const syncToOneDrive = (diaryId: number) =>
  api.post(`/onedrive/sync/${diaryId}`).then(r => r.data)
