import { useSettingsStore } from '../stores/settings'

function base() {
  const s = useSettingsStore()
  return (s.instanceUrl || '').replace(/\/+$/, '')
}

async function j(path) {
  const url = base() + path
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    throw new Error(`Failed to load: ${e.message}. Check your instance in Settings.`)
  }
}

export function resolveUrl(u) {
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return u
  return base() + (u.startsWith('/') ? u : '/' + u)
}

export const api = {
  popular:  ()          => j('/api/v1/popular'),
  search:   (q, type='video') => j(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type}`),
  video:    (id)        => j(`/api/v1/videos/${id}`),
  channel:  (id)        => j(`/api/v1/channels/${id}`),
  playlist: (id)        => j(`/api/v1/playlists/${id}`),
  comments: (id)        => j(`/api/v1/comments/${id}`)
}

function heightOf(f) {
  const src = f.height || f.resolution || f.qualityLabel || f.quality || ''
  const m = String(src).match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

export function pickStream(video, quality = 'highest') {
  const formats = (video.formatStreams || []).filter(f => {
    const t = (f.type || '').toLowerCase()
    const c = (f.container || '').toLowerCase()
    return t.includes('mp4') || c === 'mp4'
  })
  if (!formats.length) return null
  const sorted = [...formats].sort((a, b) => heightOf(b) - heightOf(a))
  if (quality === 'lowest') return sorted[sorted.length - 1]
  if (quality === 'medium' && sorted.length > 1) return sorted[Math.floor(sorted.length / 2)]
  return sorted[0]
}

export function bestThumbnail(video) {
  const list = video.videoThumbnails || []
  if (!list.length) return null
  let hit = null
  for (const q of ['maxres', 'high', 'medium', 'sddefault', 'default']) {
    hit = list.find(t => t.quality === q)
    if (hit) break
  }
  if (!hit) hit = list[0]
  // Resolve relative URLs so thumbnails load correctly
  return { ...hit, url: resolveUrl(hit.url) }
}

export function formatBytes(n) {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`
}

export function formatDuration(seconds) {
  const s = parseInt(seconds, 10) || 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
