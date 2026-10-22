// src/api/piped-client.js
const BACKEND_URL = '/api/proxy';

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
export function bestThumbnail(video) { return video.thumbnails?.[0] || null; }
export function pickStream(video, quality = 'highest') { return video.streamingData?.formats?.[0] || null; }

export const api = {
  popular: async () => {
    // This now calls YOUR proxy, which adds the API key
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=trending`);
    const data = await res.json();
    return data.videos || [];
  },
  search: async (q, type = 'video') => {
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.videos || [];
  },
  video: async (id) => {
    const res = await fetch(`${BACKEND_URL}?path=video&url=https://www.youtube.com/watch?v=${id}`);
    return await res.json();
  }
};
