// src/api/piped-client.js
import { Innertube } from 'youtubei.js';

const BACKEND_PROXY = '/api/proxy';

// Lists of active instances to try before falling back to the Vercel proxy
const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://invidious.f5.si',
  'https://yewtu.be'
];

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de'
];

// --- Standardization Helpers ---

function normalizeInvidiousVideo(v) {
  return {
    videoId: v.videoId,
    title: v.title || 'Untitled',
    author: v.author || 'Unknown',
    authorId: v.authorId || '',
    lengthSeconds: v.lengthSeconds || 0,
    videoThumbnails: v.videoThumbnails || []
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
    videoThumbnails: v.thumbnail ? [{ url: v.thumbnail }] : []
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

async function fetchFromProxy(endpoint) {
  const res = await fetch(`${BACKEND_PROXY}?url=${encodeURIComponent(endpoint)}`);
  const data = await res.json();
  if (data.proxy_error) throw new Error(data.proxy_error);
  return data;
}

// --- Main API Interface ---

export const api = {
  popular: async () => {
    // 1. Try Invidious Trending
    try {
      const data = await fetchFromInvidious('/api/v1/popular');
      return data.map(normalizeInvidiousVideo);
    } catch (e) { console.warn('Invidious popular failed, trying Piped...'); }

    // 2. Try Piped Trending
    try {
      const data = await fetchFromPiped('/trending?region=US');
      return data.map(normalizePipedVideo);
    } catch (e) { console.warn('Piped popular failed, trying Vercel Proxy...'); }

    // 3. Fallback to Vercel Proxy (youtubei.js)
    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const results = await yt.search('trending', { type: 'video' });
    return results.videos.map(v => ({
      videoId: v.id,
      title: v.title?.toString() || 'Untitled',
      author: v.author?.name || 'Unknown',
      authorId: v.author?.id || '',
      lengthSeconds: v.duration?.seconds || 0,
      videoThumbnails: v.thumbnails?.map(t => ({ url: t.url })) || []
    }));
  },

  search: async (q, type = 'video') => {
    // 1. Try Invidious Search
    try {
      const data = await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type}`);
      return data.map(normalizeInvidiousVideo);
    } catch (e) { console.warn('Invidious search failed, trying Piped...'); }

    // 2. Try Piped Search
    try {
      const filter = type === 'video' ? 'videos' : 'channels';
      const data = await fetchFromPiped(`/search?q=${encodeURIComponent(q)}&filter=${filter}`);
      const items = data.items || data;
      return items.map(normalizePipedVideo);
    } catch (e) { console.warn('Piped search failed, trying Vercel Proxy...'); }

    // 3. Fallback to Vercel Proxy
    const yt = await Innertube.create({ client_type: 'WEB', generate_session_locally: true });
    const results = await yt.search(q, { type });
    if (type === 'video') {
      return results.videos.map(v => ({
        videoId: v.id,
        title: v.title?.toString() || 'Untitled',
        author: v.author?.name || 'Unknown',
        authorId: v.author?.id || '',
        lengthSeconds: v.duration?.seconds || 0,
        videoThumbnails: v.thumbnails?.map(t => ({ url: t.url })) || []
      }));
    }
    return results;
  },

  video: async (id) => {
    // 1. Try Invidious
    try {
      const data = await fetchFromInvidious(`/api/v1/videos/${id}`);
      return {
        videoId: data.videoId,
        title: data.title,
        author: data.author,
        authorId: data.authorId,
        lengthSeconds: data.lengthSeconds,
        description: data.description,
        videoThumbnails: data.videoThumbnails,
        formatStreams: data.formatStreams
      };
    } catch (e) { console.warn('Invidious video failed, trying Piped...'); }

    // 2. Try Piped
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
        videoThumbnails: data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : [],
        formatStreams: best ? [{
          url: best.url,
          qualityLabel: best.quality,
          container: 'mp4',
          type: 'video/mp4'
        }] : []
      };
    } catch (e) { console.warn('Piped video failed, trying Vercel Proxy...'); }

    // 3. Fallback to Vercel Proxy
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
      videoThumbnails: info.basic_info.thumbnail?.map(t => ({ url: t.url })) || [],
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
