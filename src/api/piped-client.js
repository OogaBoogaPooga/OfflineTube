// src/api/piped-client.js
import { Innertube } from 'youtubei.js';

const BACKEND_PROXY = '/api/proxy';
const INVIDIOUS_INSTANCES = ['https://invidious.f5.si', 'https://inv.thepixora.com'];
const PIPED_INSTANCES = ['https://api.piped.private.coffee', 'https://pipedapi.leptons.xyz', 'https://pipedapi.nosebs.ru'];

// Use mqdefault instead of hqdefault to prevent 404s on newer videos
function getThumbnail(videoId) {
  return [{ url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }];
}

function normalizeInvidiousVideo(v) {
  return {
    videoId: v.videoId, title: v.title || 'Untitled', author: v.author || 'Unknown', authorId: v.authorId || '',
    authorAvatar: v.authorThumbnails?.[0]?.url || null, lengthSeconds: v.lengthSeconds || 0, videoThumbnails: getThumbnail(v.videoId)
  };
}

function normalizePipedVideo(v) {
  const id = v.url ? v.url.replace('/watch?v=', '') : v.videoId;
  return {
    videoId: id, title: v.title || 'Untitled', author: v.uploaderName || v.uploader || 'Unknown', authorId: v.uploaderUrl ? v.uploaderUrl.replace('/channel/', '') : '',
    authorAvatar: v.uploaderAvatar || null, lengthSeconds: v.duration || 0, videoThumbnails: getThumbnail(id)
  };
}

async function fetchFromInvidious(endpoint) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try { const res = await fetch(`${instance}${endpoint}`); if (res.ok) return await res.json(); } catch (e) {}
  }
  throw new Error('Invidious failed');
}

async function fetchFromPiped(endpoint) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const proxyUrl = `${BACKEND_PROXY}?url=${encodeURIComponent(instance + endpoint)}`;
      const res = await fetch(proxyUrl); if (res.ok) return await res.json();
    } catch (e) {}
  }
  throw new Error('Piped failed');
}

export const api = {
  popular: async () => {
    try { return (await fetchFromInvidious('/api/v1/popular')).map(normalizeInvidiousVideo); } catch (e) {}
    try { return (await fetchFromPiped('/trending?region=US')).map(normalizePipedVideo); } catch (e) {}
    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const results = await yt.search('trending', { type: 'video' });
    return results.videos.map(v => ({ videoId: v.id, title: v.title?.toString() || '', author: v.author?.name || '', authorId: v.author?.id || '', authorAvatar: v.author?.thumbnails?.[0]?.url || null, lengthSeconds: v.duration?.seconds || 0, videoThumbnails: getThumbnail(v.id) }));
  },

  search: async (q, type = 'video') => {
    try { return (await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type}`)).map(normalizeInvidiousVideo); } catch (e) {}
    try { return (await fetchFromPiped(`/search?q=${encodeURIComponent(q)}&filter=${type === 'video' ? 'videos' : 'channels'}`)).items.map(normalizePipedVideo); } catch (e) {}
    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const results = await yt.search(q, { type });
    return (results.videos || []).map(v => ({ videoId: v.id, title: v.title?.toString() || '', author: v.author?.name || '', authorId: v.author?.id || '', authorAvatar: v.author?.thumbnails?.[0]?.url || null, lengthSeconds: v.duration?.seconds || 0, videoThumbnails: getThumbnail(v.id) }));
  },

  video: async (id) => {
    try {
      const data = await fetchFromInvidious(`/api/v1/videos/${id}`);
      return { videoId: id, title: data.title, author: data.author, authorId: data.authorId, authorAvatar: data.authorThumbnails?.[0]?.url || null, lengthSeconds: data.lengthSeconds, description: data.description, videoThumbnails: getThumbnail(id), formatStreams: data.formatStreams || [] };
    } catch (e) {}

    try {
      const data = await fetchFromPiped(`/streams/${id}`);
      const formats = (data.videoStreams || []).filter(s => !s.videoOnly && s.url).map(s => ({ url: s.url, qualityLabel: s.quality, container: 'mp4', type: 'video/mp4' }));
      return { videoId: id, title: data.title, author: data.uploader, authorId: data.uploaderUrl?.replace('/channel/', ''), authorAvatar: data.uploaderAvatar || null, lengthSeconds: data.duration, description: data.description, videoThumbnails: getThumbnail(id), formatStreams: formats };
    } catch (e) {}

    // Fallback to youtubei.js via proxy
    try {
      const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
      const info = await yt.getInfo(id);
      const formats = (info.streaming_data?.formats || []).map(f => ({ url: f.url || f.decipher?.(yt.session.player) || '', qualityLabel: f.quality_label, container: f.container, type: 'video/mp4' })).filter(f => f.url);
      return { videoId: id, title: info.basic_info.title, author: info.basic_info.author, authorId: info.basic_info.channel_id, authorAvatar: info.basic_info.author?.thumbnails?.[0]?.url || null, lengthSeconds: info.basic_info.duration, description: info.basic_info.short_description, videoThumbnails: getThumbnail(id), formatStreams: formats };
    } catch (e) {}

    // ULTIMATE FALLBACK: YouTube oEmbed (Never fails, no CORS)
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (res.ok) {
        const data = await res.json();
        return {
          videoId: id, title: data.title, author: data.author_name, authorId: data.author_url?.split('@')[1] || '',
          authorAvatar: `https://unavatar.io/youtube/${data.author_url?.split('@')[1] || 'youtube'}`,
          lengthSeconds: 0, description: 'Metadata loaded via oEmbed fallback.',
          videoThumbnails: [{ url: data.thumbnail_url }], formatStreams: []
        };
      }
    } catch (e) {}

    return { videoId: id, title: 'Video', author: 'Unknown', authorId: '', authorAvatar: null, lengthSeconds: 0, description: '', videoThumbnails: getThumbnail(id), formatStreams: [] };
  },

  comments: async (id) => {
    try {
      const data = await fetchFromInvidious(`/api/v1/comments/${id}`);
      return (data.comments || []).map(c => ({ commentId: c.commentId, author: c.author, content: c.content }));
    } catch (e) {}
    try {
      const data = await fetchFromPiped(`/comments/${id}`);
      return (data.comments || []).map(c => ({ commentId: c.id, author: c.author, content: c.commentText }));
    } catch (e) { return []; }
  }
};

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
export function bestThumbnail(video) { return video.videoThumbnails?.length ? video.videoThumbnails[0] : null; }
export function pickStream(video, quality = 'highest') { return video.formatStreams?.length ? video.formatStreams[0] : null; }
