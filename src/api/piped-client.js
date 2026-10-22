// src/api/piped-client.js
const BACKEND_URL = '/api/proxy';

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

export function bestThumbnail(video) { 
  if (video.thumbnails && Array.isArray(video.thumbnails)) return video.thumbnails[0];
  if (video.thumbnail) return { url: video.thumbnail };
  return null;
}

export function pickStream(video, quality = 'highest') { 
  return video.streamingData?.formats?.[0] || null; 
}

export const api = {
  popular: async () => {
    // Use 'search_query' instead of 'url' or 'q'
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=trending`);
    const data = await res.json();
    
    // LOG THE RAW RESPONSE so we can see it in the console!
    console.log("Raw API Response for Trending:", data);
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    // Try to find the array in various common formats
    if (Array.isArray(data)) return data;
    if (data.videos) return data.videos;
    if (data.results) return data.results;
    if (data.data) return data.data;
    if (data.items) return data.items;
    if (data.search_results) return data.search_results;
    
    return [];
  },
  
  search: async (q, type = 'video') => {
    const res = await fetch(`${BACKEND_URL}?path=search&search_query=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    console.log(`Raw API Response for Search (${q}):`, data);
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    if (Array.isArray(data)) return data;
    if (data.videos) return data.videos;
    if (data.results) return data.results;
    if (data.data) return data.data;
    if (data.items) return data.items;
    if (data.search_results) return data.search_results;
    
    return [];
  },
  
  video: async (id) => {
    const res = await fetch(`${BACKEND_URL}?path=video&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    const data = await res.json();
    
    console.log(`Raw API Response for Video (${id}):`, data);
    
    if (data.error) throw new Error(`API Error: ${data.error}`);
    
    return data.data || data.result || data;
  }
};
