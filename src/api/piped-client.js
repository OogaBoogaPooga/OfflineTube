// src/api/piped-client.js
const BACKEND_URL = '/api/proxy';

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

export function bestThumbnail(video) { 
  // Handle different thumbnail structures the API might return
  if (video.thumbnails && Array.isArray(video.thumbnails)) return video.thumbnails[0];
  if (video.thumbnail) return { url: video.thumbnail };
  return null;
}

export function pickStream(video, quality = 'highest') { 
  return video.streamingData?.formats?.[0] || null; 
}

export const api = {
  popular: async () => {
    // Pass the full YouTube search URL to the API
    const targetUrl = encodeURIComponent('https://www.youtube.com/results?search_query=trending');
    const res = await fetch(`${BACKEND_URL}?path=search&url=${targetUrl}`);
    const data = await res.json();
    
    // Handle different array names the API might use
    if (Array.isArray(data)) return data;
    if (data.videos) return data.videos;
    if (data.results) return data.results;
    if (data.data) return data.data;
    
    return [];
  },
  
  search: async (q, type = 'video') => {
    const targetUrl = encodeURIComponent(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
    const res = await fetch(`${BACKEND_URL}?path=search&url=${targetUrl}`);
    const data = await res.json();
    
    if (Array.isArray(data)) return data;
    if (data.videos) return data.videos;
    if (data.results) return data.results;
    if (data.data) return data.data;
    
    return [];
  },
  
  video: async (id) => {
    // Pass the full YouTube watch URL to the API
    const targetUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
    const res = await fetch(`${BACKEND_URL}?path=video&url=${targetUrl}`);
    const data = await res.json();
    
    // Return the video object
    return data.data || data.result || data;
  }
};
