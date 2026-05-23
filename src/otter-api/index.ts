import { getToken } from './token'

const BASE_URL = 'https://otter-api-zeta.vercel.app'

async function request(path: string, params: Record<string, any> = {}): Promise<any> {
  const token = await getToken()
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const qs = query.toString()
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Otter API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export interface SearchParams {
  keyword: string
  page?: number
  page_size?: number
}

export interface VideoParams {
  bvid?: string
  aid?: number
  p?: number
  qn?: number
  fnval?: number
}

export async function searchVideos(params: SearchParams) {
  return request('/bilibili/search', params)
}

export async function getVideoInfo(params: VideoParams) {
  return request('/bilibili/video', params)
}

export interface SubtitleParams {
  bvid?: string
  aid?: number
  cid?: number
  p?: number
}

export async function getSubtitles(params: SubtitleParams) {
  return request('/bilibili/subtitle', params)
}
