import { create } from 'zustand';

const statusPriority = {
  downloading: 0,
  checking: 1,
  queued: 2,
  needs_resume: 3,
  paused: 4,
  failed: 5,
  stopped: 6,
  completed: 7
};

function sortTorrents(torrents = []) {
  return [...torrents].sort((left, right) => {
    const priorityDelta = (statusPriority[left.status] ?? 9) - (statusPriority[right.status] ?? 9);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime();
  });
}

export const useTorrentStore = create((set, get) => ({
  torrents: [],
  media: [],
  loading: false,
  mediaLoading: false,
  error: null,
  connectionStatus: 'disconnected',
  setLoading: (loading) => set({ loading }),
  setMediaLoading: (mediaLoading) => set({ mediaLoading }),
  setError: (error) => set({ error }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setTorrents: (torrents) => set({ torrents: sortTorrents(torrents) }),
  setMedia: (media) => set({ media }),
  upsertTorrent: (torrent) =>
    set((state) => {
      const nextTorrents = state.torrents.filter((item) => item.id !== torrent.id);
      nextTorrents.push(torrent);
      return { torrents: sortTorrents(nextTorrents) };
    }),
  removeTorrent: (id) =>
    set((state) => ({
      torrents: state.torrents.filter((torrent) => torrent.id !== id),
      media: state.media.filter((item) => item.torrentId !== id)
    })),
  patchTorrent: (id, partial) =>
    set((state) => ({
      torrents: sortTorrents(
        state.torrents.map((torrent) => (torrent.id === id ? { ...torrent, ...partial } : torrent))
      )
    })),
  getTorrentById: (id) => get().torrents.find((torrent) => torrent.id === id),
  getTorrentFiles: (id) => get().torrents.find((torrent) => torrent.id === id)?.files || []
}));
