// src/api/piped-client.js
const BACKEND_URL = '/api/proxy';

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

export function bestThumbnail(video) { 
  if (video.videoThumbnails && Array.isArray(video.videoThumbnails)) return video.videoThumbnails[0];
  if (video.thumbnails && Array.isArray(video.thumbnails)) return video.thumbnails[0];
  return null;
}

export function pickStream(video, quality = 'highest') { 
  return video.streamingData?.formats?.[0] || null; 
}

// Robust translator for the Scraper API response
function mapVideo(v) {
  // 1. Get Video ID
  let id = v.videoId || v.id;
  if (!id && v.link) {
    const match = v.link.match(/v=([^&]+)/);
    if (match) id = match[1];
  }
  if (!id && v.url) {
    const match = v.url.match(/v=([^&]+)/);
    if (match) id = match[1];
  }

  // 2. Get Thumbnail URL (handle nested objects)
  let thumb = v.thumbnail || v.thumbnailUrl || v.image;
  if (typeof thumb === 'object' && thumb !== null) {
    thumb = thumb.url || thumb.static || thumb.src;
  }
  if (!thumb && v.thumbnails && v.thumbnails.length > 0) {
    thumb = v.thumbnails[0].url || v.thumbnails[0];
    if (typeof thumb === 'object') thumb = thumb.url;
  }

  // 3. Convert Duration to Seconds (e.g., "3:45" -> 225)
  let seconds = v.duration || v.length || v.lengthSeconds || 0;
  if (typeof seconds === 'string' && seconds.includes(':')) {
    const parts = seconds.split(':').map(Number);
    if (parts.length === 2) seconds = parts[0] * 60 + parts[1]; // MM:SS
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  seconds = parseInt(seconds, 10) || 0;

  return {
    videoId: id || Math.random().toString(36).substring(7), // Fallback ID if missing
    title: v.title || 'Unknown Title',
    author: v.channel?.name || v.channel || v.author || v.uploader || 'Unknown Channel',
    authorId: v.channel?.id || v.channel_id || '',
    lengthSeconds: seconds,
    videoThumbnails: thumb ? [{ url: thumb }] : []
  };
}

export const api = {
  popular: async () => {
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=trending`);
    const data = await res.json();
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    if (data.organic_results) return data.organic_results.map(mapVideo);
    
    return [];
  },
  
  search: async (q, type = 'video') => {
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    if (data.organic_results) return data.organic_results.map(mapVideo);
    
    return [];
  },
  
  video: async (id) => {
    const res = await fetch(`${BACKEND_URL}?path=video&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    const data = await res.json();
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    return data.data || data.result || data;
  }
};
