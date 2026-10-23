// src/api/piped-client.js
import { Innertube, ClientType } from 'youtubei.js';

const BACKEND_PROXY = '/api/proxy';

const ROTATION_QUERIES = [
  'trending', 
  'technology', 
  'gaming', 
  'news', 
  'documentary', 
  'science', 
  'comedy', 
  'sports highlights'
];
let currentQueryIndex = 0;

function getThumbnail(videoId) {
  return [{ url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }];
}

function mapYTNode(v) {
  return {
    videoId: v.id,
    title: v.title?.toString() || 'Untitled',
    author: v.author?.name || 'Unknown',
    authorId: v.author?.id || '',
    authorAvatar: v.author?.thumbnails?.[0]?.url || `https://ui-avatars.com/api/?name=${v.author?.name?.charAt(0)}&background=282828&color=fff`,
    lengthSeconds: v.duration?.seconds || 0,
    videoThumbnails: getThumbnail(v.id)
  };
}

async function fetchFromInvidious(endpoint) {
  const instances = ['https://invidious.f5.si', 'https://inv.thepixora.com'];
  for (const instance of instances) {
    try { const res = await fetch(`${instance}${endpoint}`); if (res.ok) return await res.json(); } catch (e) {}
  }
  throw new Error('Invidious failed');
}

async function fetchFromPiped(endpoint) {
  const instances = ['https://api.piped.private.coffee', 'https://pipedapi.leptons.xyz'];
  for (const instance of instances) {
    try {
      const proxyUrl = `${BACKEND_PROXY}?url=${encodeURIComponent(instance + endpoint)}`;
      const res = await fetch(proxyUrl); if (res.ok) return await res.json();
    } catch (e) {}
  }
  throw new Error('Piped failed');
}

export const api = {
  popular: async () => {
    // 1. Try the YouTube Home Feed (works sometimes)
    try {
      const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
      const feed = await yt.getHomeFeed();
      if (feed.videos && feed.videos.length > 0) {
        return feed.videos.map(mapYTNode);
      }
    } catch (e) {}

    // 2. Use a rotating category with the TV_EMBEDDED client (very reliable)
    const query = ROTATION_QUERIES[currentQueryIndex % ROTATION_QUERIES.length];
    currentQueryIndex++; // Advance the index for the next time

    try {
      const yt = await Innertube.create({ client_type: ClientType.TV_EMBEDDED, generate_session_locally: true });
      const results = await yt.search(query, { type: 'video' });
      if (results.videos && results.videos.length > 0) {
        return results.videos.map(mapYTNode);
      }
    } catch (e) { console.warn('TV search failed, trying Invidious...'); }

    // 3. Fallback to Invidious
    try { 
      const data = await fetchFromInvidious('/api/v1/popular');
      if (data.length > 0) return data.map(v => ({ ...v, videoThumbnails: getThumbnail(v.videoId) })); 
    } catch (e) {}

    // 4. Fallback to Piped
    try { 
      const data = await fetchFromPiped('/trending?region=US');
      if (data.items && data.items.length > 0) return data.items.map(v => ({ ...v, videoThumbnails: getThumbnail(v.url.replace('/watch?v=', '')) })); 
    } catch (e) {}
    
    return [];
  },

  search: async (q, type = 'video') => {
    try {
      const yt = await Innertube.create({ client_type: ClientType.TV_EMBEDDED, generate_session_locally: true });
      const results = await yt.search(q, { type });
      return (results.videos || []).map(mapYTNode);
    } catch (e) {
      try { return (await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type}`)).map(v => ({ ...v, videoThumbnails: getThumbnail(v.videoId) })); } catch (err) {}
      return [];
    }
  },

  channel: async (id) => {
    try {
      const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
      const channel = await yt.getChannel(id);
      const videos = await channel.videos.next();
      return {
        author: channel.header.author.name,
        authorId: id,
        authorThumbnails: channel.header.author.thumbnails || [],
        subCount: channel.header.subscriber_count?.text || 'Unknown',
        description: channel.metadata.description || '',
        latestVideos: videos.videos.map(mapYTNode)
      };
    } catch (e) {
      return { author: 'Unknown Channel', authorId: id, authorThumbnails: [], subCount: '0', description: 'Could not load channel details.', latestVideos: [] };
    }
  },

  video: async (id) => {
    try {
      const yt = await Innertube.create({ client_type: ClientType.TV_EMBEDDED, generate_session_locally: true });
      const info = await yt.getInfo(id);
      
      const formats = (info.streaming_data?.formats || [])
        .filter(f => f.url)
        .map(f => ({ 
          url: f.url, 
          qualityLabel: f.quality_label, 
          contentLength: f.content_length, 
          container: f.container, 
          type: 'video/mp4' 
        }));
        
      return { 
        videoId: id, 
        title: info.basic_info.title, 
        author: info.basic_info.author, 
        authorId: info.basic_info.channel_id, 
        authorAvatar: info.basic_info.author?.thumbnails?.[0]?.url || `https://ui-avatars.com/api/?name=${info.basic_info.author?.charAt(0)}&background=282828&color=fff`, 
        lengthSeconds: info.basic_info.duration, 
        description: info.basic_info.short_description, 
        videoThumbnails: getThumbnail(id), 
        formatStreams: formats 
      };
    } catch (e) {
      return { videoId: id, title: 'Video', author: 'Unknown', authorId: '', authorAvatar: null, lengthSeconds: 0, description: '', videoThumbnails: getThumbnail(id), formatStreams: [] };
    }
  },

  comments: async (id) => {
    try {
      const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
      const comments = await yt.getComments(id);
      return comments.contents.map(c => ({ commentId: c.comment_id, author: c.author.name, content: c.content.toString() }));
    } catch (e) { return []; }
  }
};

export function resolveUrl(u) { return u; }
export function formatBytes(n) { if (!n) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`; }
export function formatDuration(seconds) { const s = parseInt(seconds, 10) || 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
export function bestThumbnail(video) { return video.videoThumbnails?.length ? video.videoThumbnails[0] : null; }
export function pickStream(video, quality = 'highest') { return video.formatStreams?.length ? video.formatStreams[0] : null; }
