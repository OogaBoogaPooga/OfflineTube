// src/api/piped-client.js
import { Innertube, ClientType } from 'youtubei.js';

// PASTE YOUR CLOUDFLARE WORKER URL HERE (NO trailing slash)
const CORS_PROXY_URL = 'https://offline-tube-cors-proxy.logan-storrs.workers.dev/';

function getProxyFetch() {
  return async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url || input?.href);
    
    if (!url || url === 'undefined') {
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const proxyUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, init);
    
    // Debugging: If the Worker returns an error (403, 500, etc.), log it
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Worker Error] ${response.status} on URL: ${url}`, errorText);
      throw new Error(`Worker proxy failed with status ${response.status}`);
    }
    
    return response;
  };
}

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

export const api = {
  popular: async (page = 1) => {
    try {
      const yt = await Innertube.create({ 
        client_type: ClientType.TV_EMBEDDED, 
        retrieve_player: false,
        generate_session_locally: true,
        fetch: getProxyFetch()
      });
      
      if (page === 1) {
        try {
          const feed = await yt.getHomeFeed();
          if (feed.videos && feed.videos.length > 0) return feed.videos.map(mapYTNode);
        } catch (e) {
          console.warn('Home feed failed, falling back to search:', e);
        }
      }
      
      const queries = ['trending videos', 'popular tech', 'gaming highlights', 'news today', 'top documentaries'];
      const query = queries[(page - 1) % queries.length];
      const results = await yt.search(query, { type: 'video' });
      return results.videos.map(mapYTNode);
    } catch (e) {
      console.error('Popular fetch completely failed:', e);
      return [];
    }
  },

  search: async (q, type = 'video') => {
    try {
      const yt = await Innertube.create({ 
        client_type: ClientType.TV_EMBEDDED, 
        retrieve_player: false,
        generate_session_locally: true,
        fetch: getProxyFetch()
      });
      const results = await yt.search(q, { type });
      return (results.videos || []).map(mapYTNode);
    } catch (e) { return []; }
  },

  channel: async (id) => {
    try {
      const yt = await Innertube.create({ 
        client_type: ClientType.TV_EMBEDDED, 
        retrieve_player: false,
        generate_session_locally: true,
        fetch: getProxyFetch()
      });
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
    try {
      const yt = await Innertube.create({ 
        client_type: ClientType.TV_EMBEDDED, 
        retrieve_player: false,
        generate_session_locally: true,
        fetch: getProxyFetch()
      });
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
        
      const related = (info.watch_next_feed || [])
        .filter(v => v.type === 'CompactVideo')
        .map(v => mapYTNode(v))
        .slice(0, 10);

      return { 
        videoId: id, 
        title: info.basic_info.title, 
        author: info.basic_info.author, 
        authorId: info.basic_info.channel_id, 
        authorAvatar: info.basic_info.author?.thumbnails?.[0]?.url || `https://ui-avatars.com/api/?name=${info.basic_info.author?.charAt(0)}&background=282828&color=fff`, 
        lengthSeconds: info.basic_info.duration, 
        description: info.basic_info.short_description, 
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
      const yt = await Innertube.create({ 
        client_type: ClientType.TV_EMBEDDED, 
        retrieve_player: false,
        generate_session_locally: true,
        fetch: getProxyFetch()
      });
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
