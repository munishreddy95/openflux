import { startTransition, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AddTorrent from './pages/AddTorrent.jsx';
import TorrentDetails from './pages/TorrentDetails.jsx';
import MediaLibrary from './pages/MediaLibrary.jsx';
import VideoPlayerPage from './pages/VideoPlayerPage.jsx';
import SystemUsage from './pages/SystemUsage.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';
import { fetchTorrents } from './services/torrent.api.js';
import { fetchSettings } from './services/settings.api.js';
import { fetchMediaLibrary } from './services/media.api.js';
import { connectSocket, getSocket } from './services/socket.service.js';
import { getApiError } from './services/api.service.js';
import { useTorrentStore } from './store/torrent.store.js';
import { useSettingsStore } from './store/settings.store.js';

export default function App() {
  const setTorrents = useTorrentStore((state) => state.setTorrents);
  const setMedia = useTorrentStore((state) => state.setMedia);
  const setLoading = useTorrentStore((state) => state.setLoading);
  const setMediaLoading = useTorrentStore((state) => state.setMediaLoading);
  const setTorrentError = useTorrentStore((state) => state.setError);
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const removeTorrent = useTorrentStore((state) => state.removeTorrent);
  const connectionStatus = useTorrentStore((state) => state.connectionStatus);
  const setConnectionStatus = useTorrentStore((state) => state.setConnectionStatus);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const setSettingsLoading = useSettingsStore((state) => state.setLoading);
  const setSettingsError = useSettingsStore((state) => state.setError);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setMediaLoading(true);
      setSettingsLoading(true);
      setTorrentError(null);
      setSettingsError(null);

      try {
        const [torrents, media, settings] = await Promise.all([
          fetchTorrents(),
          fetchMediaLibrary(),
          fetchSettings()
        ]);

        if (!cancelled) {
          startTransition(() => {
            setTorrents(torrents);
            setMedia(media);
            setSettings(settings);
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = getApiError(error);
          setTorrentError(message);
          setSettingsError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMediaLoading(false);
          setSettingsLoading(false);
        }
      }
    }

    async function refreshMedia() {
      try {
        const media = await fetchMediaLibrary();
        if (!cancelled) {
          startTransition(() => setMedia(media));
        }
      } catch {
        // Media refresh failures should not interrupt socket updates.
      }
    }

    const socket = getSocket();

    const cleanupSocket = connectSocket({
      connect: () => setConnectionStatus('connected'),
      disconnect: () => setConnectionStatus('disconnected'),
      'torrent:added': ({ data }) => {
        if (data) {
          upsertTorrent(data);
        }
      },
      'torrent:progress': ({ data }) => {
        if (data) {
          upsertTorrent(data);
        }
      },
      'torrent:completed': ({ data }) => {
        if (data) {
          upsertTorrent(data);
          void refreshMedia();
        }
      },
      'torrent:error': ({ data, message }) => {
        if (data) {
          upsertTorrent(data);
        }
        if (message) {
          setTorrentError(message);
        }
      },
      'torrent:paused': ({ data }) => {
        if (data) {
          upsertTorrent(data);
        }
      },
      'torrent:resumed': ({ data }) => {
        if (data) {
          upsertTorrent(data);
        }
      },
      'torrent:deleted': ({ data }) => {
        if (data?.id) {
          removeTorrent(data.id);
          void refreshMedia();
        }
      }
    });

    if (socket.connected) {
      setConnectionStatus('connected');
    }

    void loadInitialData();

    return () => {
      cancelled = true;
      cleanupSocket();
    };
  }, [
    removeTorrent,
    setConnectionStatus,
    setLoading,
    setMedia,
    setMediaLoading,
    setSettings,
    setSettingsError,
    setSettingsLoading,
    setTorrentError,
    setTorrents,
    upsertTorrent
  ]);

  return (
    <Routes>
      <Route element={<AppLayout connectionStatus={connectionStatus} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddTorrent />} />
        <Route path="/torrents/:id" element={<TorrentDetails />} />
        <Route path="/media" element={<MediaLibrary />} />
        <Route path="/media/:torrentId/:fileId" element={<VideoPlayerPage />} />
        <Route path="/system" element={<SystemUsage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
