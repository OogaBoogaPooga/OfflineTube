// Test this with a free Scraper API key (e.g., youtubescraperapi.com)
const API_KEY = 'cd_live_Ff9tud64P2lQMijGqow8oI1HgyZ7ECS1';
const BASE_URL = 'https://api.youtubescraperapi.com/api/v1/youtube';

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
export function bestThumbnail(video) { return video.thumbnails?.[0] || null; }
export function pickStream(video, quality = 'highest') { return video.streamingData?.formats?.[0] || null; }

export const api = {
  popular: async () => {
    const res = await fetch(`${BASE_URL}/search?q=trending&api_key=${API_KEY}`);
    const data = await res.json();
    return data.videos || [];
  },
  search: async (q, type = 'video') => {
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}&api_key=${API_KEY}`);
    const data = await res.json();
    return data.videos || [];
  },
  video: async (id) => {
    const res = await fetch(`${BASE_URL}/video?url=https://www.youtube.com/watch?v=${id}&api_key=${API_KEY}`);
    return await res.json();
  }
};
