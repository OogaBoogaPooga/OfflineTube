// src/api/piped-client.js
import { Innertube } from 'youtubei.js';

const BACKEND_PROXY = '/api/proxy';

// Only 1 public instance has CORS + API enabled right now
const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si'
];

// Piped instances as a backup (some public Piped instances still work)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de'
];

// Helper to construct a guaranteed working YouTube thumbnail
function getThumbnail(videoId) {
  return [{ url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }];
}

// --- Standardization Helpers ---

function normalizeInvidiousVideo(v) {
  const id = v.videoId;
  return {
    videoId: id,
    title: v.title || 'Untitled',
    author: v.author || 'Unknown',
    authorId: v.authorId || '',
    lengthSeconds: v.lengthSeconds || 0,
    videoThumbnails: getThumbnail(id) // Force a working thumbnail
  };
}

function normalizePipedVideo(v) {
  const id = v.url ? v.url.replace('/watch?v=', '') : v.videoId;
  return {
    videoId: id,
    title: v.title || 'Untitled',
    author: v.uploaderName || v.uploader || 'Unknown',
    authorId: v.uploaderUrl ? v.uploaderUrl.replace('/channel/', '') : '',
    lengthSeconds: v.duration || 0,
    videoThumbnails: getThumbnail(id) // Force a working thumbnail
  };
}

// --- Backend Fetchers ---

async function fetchFromInvidious(endpoint) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}${endpoint}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) return data;
      }
    } catch (e) {
      console.warn(`Invidious instance ${instance} failed.`);
    }
  }
  throw new Error('All Invidious instances failed');
}

async function fetchFromPiped(endpoint) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${endpoint}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) return data;
      }
    } catch (e) {
      console.warn(`Piped instance ${instance} failed.`);
    }
  }
  throw new Error('All Piped instances failed');
}

// --- Main API Interface ---

export const api = {
  popular: async () => {
    try {
      // Use the newly verified instance for trending
      const data = await fetchFromInvidious('/api/v1/popular');
      return data.map(normalizeInvidiousVideo);
    } catch (e) { console.warn('Invidious popular failed, trying Piped...'); }

    try {
      const data = await fetchFromPiped('/trending?region=US');
      return data.map(normalizePipedVideo);
    } catch (e) { console.warn('Piped popular failed, trying Vercel Proxy...'); }

    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const results = await yt.search('trending', { type: 'video' });
    return results.videos.map(v => ({
      videoId: v.id,
      title: v.title?.toString() || 'Untitled',
      author: v.author?.name || 'Unknown',
      authorId: v.author?.id || '',
      lengthSeconds: v.duration?.seconds || 0,
      videoThumbnails: getThumbnail(v.id)
    }));
  },

  search: async (q, type = 'video') => {
    try {
      const data = await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type}`);
      return data.map(normalizeInvidiousVideo);
    } catch (e) { console.warn('Invidious search failed, trying Piped...'); }

    try {
      const filter = type === 'video' ? 'videos' : 'channels';
      const data = await fetchFromPiped(`/search?q=${encodeURIComponent(q)}&filter=${filter}`);
      const items = data.items || data;
      return items.map(normalizePipedVideo);
    } catch (e) { console.warn('Piped search failed, trying Vercel Proxy...'); }

    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const results = await yt.search(q, { type });
    if (type === 'video') {
      return results.videos.map(v => ({
        videoId: v.id,
        title: v.title?.toString() || 'Untitled',
        author: v.author?.name || 'Unknown',
        authorId: v.author?.id || '',
        lengthSeconds: v.duration?.seconds || 0,
        videoThumbnails: getThumbnail(v.id)
      }));
    }
    return results;
  },

  video: async (id) => {
    try {
      const data = await fetchFromInvidious(`/api/v1/videos/${id}`);
      return {
        videoId: data.videoId,
        title: data.title,
        author: data.author,
        authorId: data.authorId,
        lengthSeconds: data.lengthSeconds,
        description: data.description,
        videoThumbnails: getThumbnail(data.videoId),
        formatStreams: data.formatStreams
      };
    } catch (e) { console.warn('Invidious video failed, trying Piped...'); }

    try {
      const data = await fetchFromPiped(`/streams/${id}`);
      const muxed = data.videoStreams?.find(s => !s.videoOnly);
      const best = muxed || data.videoStreams?.[0];
      return {
        videoId: data.videoId,
        title: data.title,
        author: data.uploader,
        authorId: data.uploaderUrl?.replace('/channel/', ''),
        lengthSeconds: data.duration,
        description: data.description,
        videoThumbnails: getThumbnail(data.videoId),
        formatStreams: best ? [{
          url: best.url,
          qualityLabel: best.quality,
          container: 'mp4',
          type: 'video/mp4'
        }] : []
      };
    } catch (e) { console.warn('Piped video failed, trying Vercel Proxy...'); }

    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const info = await yt.getInfo(id);
    const formats = info.streaming_data?.formats || [];
    const decipheredFormats = formats.map(f => ({
      url: f.url || f.decipher?.(yt.session.player) || '',
      qualityLabel: f.quality_label,
      contentLength: f.content_length,
      container: f.container,
      type: 'video/mp4'
    })).filter(f => f.url);

    return {
      videoId: info.basic_info.id,
      title: info.basic_info.title,
      author: info.basic_info.author,
      authorId: info.basic_info.channel_id,
      lengthSeconds: info.basic_info.duration,
      description: info.basic_info.short_description,
      videoThumbnails: getThumbnail(info.basic_info.id),
      formatStreams: decipheredFormats
    };
  }
};

// Keep these for the UI components
export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
export function bestThumbnail(video) {
  const list = video.videoThumbnails || [];
  if (!list.length) return null;
  return list[0];
}
export function pickStream(video, quality = 'highest') {
  const formats = video.formatStreams || [];
  if (!formats.length) return null;
  const sorted = [...formats].sort((a, b) => {
    const hA = parseInt(a.qualityLabel) || 0;
    const hB = parseInt(b.qualityLabel) || 0;
    return hB - hA;
  });
  if (quality === 'lowest') return sorted[sorted.length - 1];
  return sorted[0];
}
