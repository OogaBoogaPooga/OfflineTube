const PIPED_INSTANCE = 'https://api.piped.private.coffee';

async function j(path) {
  const url = PIPED_INSTANCE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Piped API failed: HTTP ${res.status}`);
  return res.json();
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

// --- Translators to mimic Invidious/YouTube.js structure for your components ---

function translateVideo(v) {
  return {
    videoId: v.url ? v.url.replace('/watch?v=', '') : v.videoId,
    title: v.title,
    author: v.uploaderName || v.uploader,
    authorId: v.uploaderUrl ? v.uploaderUrl.replace('/channel/', '') : v.authorId,
    lengthSeconds: v.duration,
    videoThumbnails: v.thumbnail ? [{ url: v.thumbnail }] : [],
  };
}

export const api = {
  popular: async () => {
    const data = await j('/trending?region=US');
    return data.map(translateVideo);
  },
  search: async (q, type = 'video') => {
    const filter = type === 'video' ? 'videos' : type === 'channel' ? 'channels' : 'playlists';
    const data = await j(`/search?q=${encodeURIComponent(q)}&filter=${filter}`);
    const items = data.items || data;
    if (type === 'video') return items.map(translateVideo);
    return items; // Channels and playlists are structurally similar enough
  },
  video: async (id) => {
    const data = await j(`/streams/${id}`);
    const muxed = data.videoStreams?.find(s => !s.videoOnly);
    const best = muxed || data.videoStreams?.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    return {
      videoId: data.videoId,
      title: data.title,
      author: data.uploader,
      authorId: data.uploaderUrl?.replace('/channel/', ''),
      lengthSeconds: data.duration,
      description: data.description,
      videoThumbnails: data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : [],
      formatStreams: data.videoStreams?.map(s => ({
        url: s.url,
        qualityLabel: s.quality,
        contentLength: s.contentLength,
        container: 'mp4',
        type: 'video/mp4',
      })) || []
    };
  },
  channel: async (id) => {
    const data = await j(`/channel/${id}`);
    return {
      author: data.name,
      authorId: id,
      authorThumbnails: data.avatarUrl ? [{ url: data.avatarUrl }] : [],
      subCount: data.subscriberCount,
      description: data.description,
      latestVideos: (data.relatedStreams || []).map(translateVideo)
    };
  },
  playlist: async (id) => {
    const data = await j(`/playlists/${id}`);
    return {
      title: data.name,
      author: data.uploader,
      playlistThumbnail: data.thumbnailUrl,
      videoCount: data.videos,
      videos: (data.relatedStreams || []).map(translateVideo)
    };
  },
  comments: async (id) => {
    const data = await j(`/comments/${id}`);
    return (data.comments || []).map(c => ({
      commentId: c.id,
      author: c.author,
      content: c.commentText
    }));
  }
};
