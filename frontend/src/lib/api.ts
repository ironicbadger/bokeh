import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Photo {
  id: number
  filename: string
  file_size: number
  mime_type: string
  width?: number
  height?: number
  date_taken?: string
  camera_make?: string
  camera_model?: string
  rating?: number
  is_favorite: boolean
  rotation_version?: number
  final_rotation?: number
  thumbnails?: {
    '150'?: string
    '400'?: string
    '1200'?: string
  }
}

export interface PhotosResponse {
  data: Photo[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export async function fetchPhotos(page: number = 1, order: 'desc' | 'asc' = 'desc', perPage: number = 100): Promise<PhotosResponse> {
  const response = await axios.get(`${API_URL}/api/v1/photos`, {
    params: {
      page,
      per_page: perPage,  // Increased default from 50 to 100
      sort: 'date_taken',
      order
    }
  })
  return response.data
}

export async function fetchSystemStats() {
  const response = await axios.get(`${API_URL}/api/v1/system/stats`)
  return response.data
}