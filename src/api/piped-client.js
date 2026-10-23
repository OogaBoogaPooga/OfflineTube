// src/api/piped-client.js

const WORKER_URL = 'https://offline-tube-cors-proxy.logan-storrs.workers.dev';
const PIPED_API = 'https://pipedapi.kavin.rocks';

// Helper to proxy requests through your Cloudflare Worker
async function fetchProxy(url) {
  const proxyUrl = `${WORKER_URL}?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

function getThumbnail(videoId) {
  return [{ url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }];
}

function mapPipedVideo(v) {
  const id = v.url ? v.url.replace('/watch?v=', '') : v.videoId;
  return {
    videoId: id,
    title: v.title || 'Untitled',
    author: v.uploaderName || v.uploader || 'Unknown',
    authorId: v.uploaderUrl ? v.uploaderUrl.replace('/channel/', '') : '',
    authorAvatar: v.uploaderAvatar || null,
    lengthSeconds: v.duration || 0,
    videoThumbnails: getThumbnail(id)
  };
}

export const api = {
  popular: async () => {
    try {
      const data = await fetchProxy(`${PIPED_API}/trending?region=US`);
      // Piped returns an array directly
      if (Array.isArray(data)) {
        return data.map(mapPipedVideo);
      }
      return [];
    } catch (e) {
      console.error('Home feed failed:', e);
      return [];
    }
  },

  search: async (q, type = 'video') => {
    try {
      const filter = type === 'video' ? 'videos' : 'channels';
      const data = await fetchProxy(`${PIPED_API}/search?q=${encodeURIComponent(q)}&filter=${filter}`);
      return (data.items || []).map(mapPipedVideo);
    } catch (e) { return []; }
  },

  channel: async (id) => {
    try {
      const data = await fetchProxy(`${PIPED_API}/channel/${id}`);
      return {
        author: data.name,
        authorId: id,
        authorThumbnails: data.avatarUrl ? [{ url: data.avatarUrl }] : [],
        subCount: data.subscriberCount || '0',
        description: data.description || '',
        latestVideos: (data.relatedStreams || []).map(mapPipedVideo)
      };
    } catch (e) { 
      return { author: 'Unknown', authorId: id, authorThumbnails: [], subCount: '0', description: '', latestVideos: [] }; 
    }
  },

  video: async (id) => {
    try {
      const data = await fetchProxy(`${PIPED_API}/streams/${id}`);
      
      const formats = (data.videoStreams || [])
        .filter(s => !s.videoOnly && s.url)
        .map(s => ({ 
          url: s.url, 
          qualityLabel: s.quality, 
          contentLength: s.contentLength, 
          container: 'mp4', 
          type: 'video/mp4' 
        }));
        
      const related = (data.relatedStreams || [])
        .map(mapPipedVideo)
        .slice(0, 10);

      return { 
        videoId: id, 
        title: data.title, 
        author: data.uploader, 
        authorId: data.uploaderUrl?.replace('/channel/', ''), 
        authorAvatar: data.uploaderAvatar || null, 
        lengthSeconds: data.duration, 
        description: data.description, 
        videoThumbnails: getThumbnail(id), 
        formatStreams: formats,
        related
      };
    } catch (e) {
      console.error('Video fetch failed:', e);
      return { videoId: id, title: 'Video', author: 'Unknown', authorId: '', authorAvatar: null, lengthSeconds: 0, description: '', videoThumbnails: getThumbnail(id), formatStreams: [], related: [] };
    }
  },

  comments: async (id) => {
    try {
      const data = await fetchProxy(`${PIPED_API}/comments/${id}`);
      return (data.comments || []).map(c => ({ commentId: c.id, author: c.author, content: c.commentText }));
    } catch (e) { return []; }
  }
};

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
export function bestThumbnail(video) { return video.videoThumbnails?.length ? video.videoThumbnails[0] : null; }
export function pickStream(video, quality = 'highest') { return video.formatStreams?.length ? video.formatStreams[0] : null; }
