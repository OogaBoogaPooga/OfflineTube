import { Innertube } from 'youtubei.js';

// Use the Vercel API route directly
const BACKEND_URL = '/api/proxy';

let yt;

async function getClient() {
  if (!yt) {
    yt = await Innertube.create({
      client_type: 'WEB', // Switched back to WEB, which is most reliable for search
      generate_session_locally: true,
      retrieve_player: false,
      fetch: async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        
        if (!url) {
          throw new Error('Cannot proxy an undefined URL');
        }

        const proxyUrlObj = new URL(window.location.origin + BACKEND_URL);
        proxyUrlObj.searchParams.set('url', url);
        const proxyUrl = proxyUrlObj.toString();
        
        const options = { ...init };
        if (options.method === 'GET' || options.method === 'HEAD' || !options.method) {
          delete options.body;
        }
        return fetch(proxyUrl, options);
      },
    });
  }
  return yt;
}

export function resolveUrl(u) { return u; }

export function formatBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds) {
  const s = parseInt(seconds, 10) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

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

function translateVideo(video) {
  return {
    videoId: video.id,
    title: video.title?.toString() || 'Untitled',
    author: video.author?.name || 'Unknown',
    authorId: video.author?.id,
    lengthSeconds: video.duration?.seconds || 0,
    videoThumbnails: video.thumbnails?.map(t => ({ url: t.url })) || [],
  };
}

export const api = {
  popular: async () => {
    const yt = await getClient();
    // Bypasses the removed /browse trending endpoint by searching for "trending"
    const results = await yt.search('trending', { type: 'video' });
    return results.videos.map(translateVideo);
  },
  search: async (q, type = 'video') => {
    const yt = await getClient();
    const results = await yt.search(q, { type });
    if (type === 'video') return results.videos.map(translateVideo);
    return results;
  },
  video: async (id) => {
    const yt = await getClient();
    const info = await yt.getInfo(id);
    const formats = info.streaming_data?.formats || [];
    const decipheredFormats = formats.map(f => ({
      url: f.url || f.decipher?.(yt.session.player) || '',
      qualityLabel: f.quality_label,
      contentLength: f.content_length,
      container: f.container,
      type: 'video/mp4',
    })).filter(f => f.url);

    return {
      videoId: info.basic_info.id,
      title: info.basic_info.title,
      author: info.basic_info.author,
      authorId: info.basic_info.channel_id,
      lengthSeconds: info.basic_info.duration,
      description: info.basic_info.short_description,
      videoThumbnails: info.basic_info.thumbnail?.map(t => ({ url: t.url })) || [],
      formatStreams: decipheredFormats,
    };
  },
  channel: async (id) => {
    const yt = await getClient();
    const channel = await yt.getChannel(id);
    const videos = await channel.videos.next();
    return {
      author: channel.header.author.name,
      authorId: channel.header.author.id,
      authorThumbnails: channel.header.author.thumbnails || [],
      subCount: channel.header.subscriber_count?.text,
      description: channel.metadata.description,
      latestVideos: videos.videos.map(translateVideo),
    };
  },
  playlist: async (id) => {
    const yt = await getClient();
    const playlist = await yt.getPlaylist(id);
    return {
      title: playlist.info.title,
      author: playlist.info.author.name,
      playlistThumbnail: playlist.info.thumbnails?.[0]?.url,
      videoCount: playlist.items.length,
      videos: playlist.items.map(translateVideo),
    };
  },
  comments: async (id) => {
    const yt = await getClient();
    const comments = await yt.getComments(id);
    return comments.contents.map(c => ({
      commentId: c.comment_id,
      author: c.author.name,
      content: c.content.toString(),
    }));
  },
};
