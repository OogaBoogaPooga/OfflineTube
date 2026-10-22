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

// Helper to translate the Scraper API format into the format OfflineTube expects
function mapVideo(v) {
  return {
    videoId: v.videoId || v.id || (v.link ? v.link.split('v=')[1] : Math.random().toString(36).substring(7)),
    title: v.title || 'Unknown Title',
    author: v.channel?.name || v.channel || v.author || 'Unknown Channel',
    authorId: v.channel?.id || v.channel_id || '',
    lengthSeconds: v.duration || v.length || 0,
    videoThumbnails: v.thumbnail ? [{ url: v.thumbnail }] : (v.thumbnails || [])
  };
}

export const api = {
  popular: async () => {
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=trending`);
    const data = await res.json();
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    // The Scraper API puts the videos in 'organic_results'
    if (data.organic_results) {
      return data.organic_results.map(mapVideo);
    }
    
    return [];
  },
  
  search: async (q, type = 'video') => {
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    if (data.organic_results) {
      return data.organic_results.map(mapVideo);
    }
    
    return [];
  },
  
  video: async (id) => {
    const res = await fetch(`${BACKEND_URL}?path=video&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    const data = await res.json();
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    // The Scraper API might wrap the video data in 'data' or 'result' or return it directly
    return data.data || data.result || data;
  }
};
