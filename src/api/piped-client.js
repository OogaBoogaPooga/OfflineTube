// src/api/piped-client.js
import { Innertube, ClientType } from 'youtubei.js';

const BACKEND_PROXY = '/api/proxy';

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
  popular: async () => {
    // 1. Try to get the standard YouTube Home Feed
    try {
      const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
      const feed = await yt.getHomeFeed();
      if (feed.videos && feed.videos.length > 0) {
        return feed.videos.map(mapYTNode);
      }
    } catch (e) { console.warn('Home feed failed, trying search...'); }

    // 2. Fallback to a general search if the home feed fails
    try {
      const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
      const results = await yt.search('trending', { type: 'video' });
      return results.videos.map(mapYTNode);
    } catch (e) {}

    return [];
  },

  search: async (q, type = 'video') => {
    const yt = await Innertube.create({ client_type: ClientType.WEB, generate_session_locally: true });
    const results = await yt.search(q, { type });
    return (results.videos || []).map(mapYTNode);
  },

  channel: async (id) => {
    // Fixes the 'g.channel is not a function' error
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
      console.error('Channel fetch failed:', e);
      return { author: 'Unknown Channel', authorId: id, authorThumbnails: [], subCount: '0', description: 'Could not load channel details.', latestVideos: [] };
    }
  },

  video: async (id) => {
    // Use TV_EMBEDDED to get higher quality muxed streams (up to 720p)
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
      console.error('Video fetch failed:', e);
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
