export interface Photo {
  id: number
  filename: string
  original_name: string
  url: string
  upload_order: number
}

export interface Diary {
  id: number
  title: string
  date: string
  keywords: string[]
  diary_text: string
  ai_provider: string
  created_at: string
  photos: Photo[]
  onedrive_status: 'none' | 'pending' | 'synced' | 'failed'
}

export interface DiaryListItem {
  id: number
  title: string
  date: string
  keywords: string[]
  diary_text: string
  created_at: string
  thumbnail_url: string | null
  onedrive_status: 'none' | 'pending' | 'synced' | 'failed'
}

export interface AppSettings {
  default_ai_provider: string
  child_name: string
  kakao_js_key: string
  onedrive_authenticated: boolean
  photos_base_url: string
}
