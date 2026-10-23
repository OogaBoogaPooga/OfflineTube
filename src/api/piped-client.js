// src/api/piped-client.js
import { Innertube, ClientType } from 'youtubei.js';

const BACKEND_PROXY = '/api/proxy';

// A larger pool of instances to ensure we get metadata
const INVIDIOUS_INSTANCES = ['https://invidious.f5.si', 'https://inv.thepixora.com', 'https://yewtu.be'];
const PIPED_INSTANCES = ['https://pipedapi.kavin.rocks', 'https://api.piped.private.coffee', 'https://pipedapi.leptons.xyz', 'https://pipedapi.nosebs.ru'];

const CATEGORIES = ['trending', 'technology', 'gaming', 'news', 'documentary', 'science', 'comedy', 'sports'];

function getThumbnail(videoId) {
  return [{ url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` }];
}

function mapYTNode(v) {
  return {
    videoId: v.id || v.videoId,
    title: v.title?.toString() || 'Untitled',
    author: v.author?.name || v.author || 'Unknown',
    authorId: v.author?.id || v.authorId || '',
    authorAvatar: v.author?.thumbnails?.[0]?.url || v.authorThumbnails?.[0]?.url || null,
    lengthSeconds: v.duration?.seconds || v.lengthSeconds || 0,
    videoThumbnails: getThumbnail(v.id || v.videoId)
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
  popular: async (page = 1) => {
    const query = CATEGORIES[(page - 1) % CATEGORIES.length];
    
    // 1. Try Invidious Search (reliable metadata)
    try { 
      const data = await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      if (data.length > 0) return data.map(mapYTNode); 
    } catch (e) {}
    
    // 2. Try Piped Search
    try { 
      const data = await fetchFromPiped(`/search?q=${encodeURIComponent(query)}&filter=videos`);
      if (data.items && data.items.length > 0) return data.items.map(mapYTNode); 
    } catch (e) {}
    
    // 3. Fallback to youtubei.js
    try {
      const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
      const results = await yt.search(query, { type: 'video' });
      return results.videos.map(mapYTNode);
    } catch (e) { return []; }
  },

  search: async (q, type = 'video') => {
    try { return (await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type}`)).map(mapYTNode); } catch (e) {}
    try { return (await fetchFromPiped(`/search?q=${encodeURIComponent(q)}&filter=${type === 'video' ? 'videos' : 'channels'}`)).items.map(mapYTNode); } catch (e) {}
    
    const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
    const results = await yt.search(q, { type });
    return (results.videos || []).map(mapYTNode);
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
      return { author: 'Unknown Channel', authorId: id, authorThumbnails: [], subCount: '0', description: '', latestVideos: [] };
    }
  },

  video: async (id) => {
    // 1. Try Invidious (Provides metadata AND related videos AND streams)
    try {
      const data = await fetchFromInvidious(`/api/v1/videos/${id}`);
      return { 
        videoId: id, title: data.title, author: data.author, authorId: data.authorId, 
        authorAvatar: data.authorThumbnails?.[0]?.url || null, 
        lengthSeconds: data.lengthSeconds, description: data.description, 
        videoThumbnails: getThumbnail(id), formatStreams: data.formatStreams || [],
        related: (data.recommendedVideos || []).slice(0, 10).map(mapYTNode)
      };
    } catch (e) {}

    // 2. Try Piped (Provides metadata AND related videos AND streams)
    try {
      const data = await fetchFromPiped(`/streams/${id}`);
      const formats = (data.videoStreams || []).filter(s => !s.videoOnly && s.url).map(s => ({ url: s.url, qualityLabel: s.quality, container: 'mp4', type: 'video/mp4' }));
      return { 
        videoId: id, title: data.title, author: data.uploader, authorId: data.uploaderUrl?.replace('/channel/', ''), 
        authorAvatar: data.uploaderAvatar || null, 
        lengthSeconds: data.duration, description: data.description, 
        videoThumbnails: getThumbnail(id), formatStreams: formats,
        related: (data.relatedStreams || []).slice(0, 10).map(mapYTNode)
      };
    } catch (e) {}

    // 3. Fallback to youtubei.js TV client (Streams only, no related videos)
    try {
      const yt = await Innertube.create({ client_type: ClientType.TV_EMBEDDED, generate_session_locally: true });
      const info = await yt.getInfo(id);
      const formats = (info.streaming_data?.formats || []).map(f => ({ url: f.url, qualityLabel: f.quality_label, container: f.container, type: 'video/mp4' })).filter(f => f.url);
      return { 
        videoId: id, title: info.basic_info.title, author: info.basic_info.author, authorId: info.basic_info.channel_id, 
        authorAvatar: info.basic_info.author?.thumbnails?.[0]?.url || null, 
        lengthSeconds: info.basic_info.duration, description: info.basic_info.short_description, 
        videoThumbnails: getThumbnail(id), formatStreams: formats,
        related: []
      };
    } catch (e) {}

    // 4. Ultimate Fallback (oEmbed)
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (res.ok) {
        const data = await res.json();
        // Try to extract the channel handle from the author_url
        const handle = data.author_url?.split('@')[1] || '';
        return {
          videoId: id, title: data.title, author: data.author_name, authorId: handle,
          authorAvatar: `https://ui-avatars.com/api/?name=${data.author_name?.charAt(0)}&background=282828&color=fff`,
          lengthSeconds: 0, description: 'Metadata loaded via fallback.',
          videoThumbnails: [{ url: data.thumbnail_url }], formatStreams: [], related: []
        };
      }
    } catch (e) {}

    return { videoId: id, title: 'Video', author: 'Unknown', authorId: '', authorAvatar: null, lengthSeconds: 0, description: '', videoThumbnails: getThumbnail(id), formatStreams: [], related: [] };
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
