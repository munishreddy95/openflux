import { startTransition, useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AddTorrent from './pages/AddTorrent.jsx';
import TorrentDetails from './pages/TorrentDetails.jsx';
import MediaLibrary from './pages/MediaLibrary.jsx';
import VideoPlayerPage from './pages/VideoPlayerPage.jsx';
import SystemUsage from './pages/SystemUsage.jsx';
import Settings from './pages/Settings.jsx';
import Account from './pages/Account.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import { fetchSessionStatus, logoutUser } from './services/auth.api.js';
import { fetchTorrents } from './services/torrent.api.js';
import { fetchSettings } from './services/settings.api.js';
import { fetchMediaLibrary } from './services/media.api.js';
import { connectSocket, disconnectSocket, getSocket } from './services/socket.service.js';
import { getApiError } from './services/api.service.js';
import { useTorrentStore } from './store/torrent.store.js';
import { useSettingsStore } from './store/settings.store.js';
import { useAuthStore } from './store/auth.store.js';

function BootScreen() {
  return (
    <div className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <div className="glass-panel w-full max-w-xl rounded-[36px] p-8 text-center sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-highlight/80">OpenFlux</p>
          <div className="mt-6 space-y-4">
            <div className="mx-auto h-6 w-40 overflow-hidden rounded-full bg-white/8">
              <div className="skeleton-shimmer h-full w-full rounded-full" />
            </div>
            <div className="mx-auto h-4 w-64 overflow-hidden rounded-full bg-white/8">
              <div className="skeleton-shimmer h-full w-full rounded-full" />
            </div>
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="skeleton-shimmer h-full w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ authStatus }) {
  if (authStatus === 'loading') {
    return <BootScreen />;
  }

  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnly({ authStatus, currentUser, children }) {
  if (authStatus === 'loading') {
    return <BootScreen />;
  }

  if (authStatus === 'authenticated' && currentUser) {
    return <Navigate to={currentUser.mustChangePassword ? '/account' : '/'} replace />;
  }

  return children;
}

function RequireResolvedPassword({ currentUser, children }) {
  if (currentUser?.mustChangePassword) {
    return <Navigate to="/account" replace />;
  }

  return children;
}

function RequireAdmin({ currentUser, children }) {
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const initialAuthSnapshotRef = useRef(null);
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const setAuthLoading = useAuthStore((state) => state.setLoading);
  const setSessionStatus = useAuthStore((state) => state.setSessionStatus);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setTorrents = useTorrentStore((state) => state.setTorrents);
  const setMedia = useTorrentStore((state) => state.setMedia);
  const setLoading = useTorrentStore((state) => state.setLoading);
  const setMediaLoading = useTorrentStore((state) => state.setMediaLoading);
  const setTorrentError = useTorrentStore((state) => state.setError);
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const removeTorrent = useTorrentStore((state) => state.removeTorrent);
  const connectionStatus = useTorrentStore((state) => state.connectionStatus);
  const setConnectionStatus = useTorrentStore((state) => state.setConnectionStatus);
  const resetTorrentStore = useTorrentStore((state) => state.reset);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const setSettingsLoading = useSettingsStore((state) => state.setLoading);
  const setSettingsError = useSettingsStore((state) => state.setError);
  const resetSettingsStore = useSettingsStore((state) => state.reset);

  if (initialAuthSnapshotRef.current === null) {
    initialAuthSnapshotRef.current = {
      hadCachedAuthenticatedUser: authStatus === 'authenticated' && Boolean(currentUser)
    };
  }

  useEffect(() => {
    let cancelled = false;
    const { hadCachedAuthenticatedUser } = initialAuthSnapshotRef.current;

    async function loadSession() {
      if (!hadCachedAuthenticatedUser) {
        setAuthLoading();
      }

      try {
        const sessionStatus = await fetchSessionStatus();
        if (!cancelled) {
          setSessionStatus(sessionStatus);
        }
      } catch (error) {
        if (!cancelled && !hadCachedAuthenticatedUser) {
          clearSession();
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession, setAuthLoading, setSessionStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser || currentUser.mustChangePassword) {
      disconnectSocket();
      setConnectionStatus('disconnected');
      resetTorrentStore();
      resetSettingsStore();
      return undefined;
    }

    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setMediaLoading(true);
      setSettingsLoading(currentUser.role === 'admin');
      setTorrentError(null);
      setSettingsError(null);

      try {
        const [torrentsResult, mediaResult, settingsResult] = await Promise.allSettled([
          fetchTorrents(),
          fetchMediaLibrary(),
          currentUser.role === 'admin' ? fetchSettings() : Promise.resolve(null)
        ]);

        if (cancelled) {
          return;
        }

        const nextTorrentError = torrentsResult.status === 'rejected'
          ? getApiError(torrentsResult.reason)
          : null;
        const nextMediaError = mediaResult.status === 'rejected'
          ? getApiError(mediaResult.reason)
          : null;
        const nextSettingsError = settingsResult.status === 'rejected'
          ? getApiError(settingsResult.reason)
          : null;

        startTransition(() => {
          setTorrents(torrentsResult.status === 'fulfilled' ? torrentsResult.value : []);
          setMedia(mediaResult.status === 'fulfilled' ? mediaResult.value : []);
          setSettings(
            currentUser.role === 'admin' && settingsResult.status === 'fulfilled'
              ? settingsResult.value
              : null
          );
        });

        setTorrentError(nextTorrentError || nextMediaError);
        setSettingsError(nextSettingsError || null);
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
      connect_error: (error) => {
        setConnectionStatus('disconnected');
        if (String(error?.message || '').toLowerCase().includes('authentication')) {
          clearSession();
        }
      },
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
      disconnectSocket();
      setConnectionStatus('disconnected');
    };
  }, [
    authStatus,
    clearSession,
    currentUser,
    removeTorrent,
    resetSettingsStore,
    resetTorrentStore,
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

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // The local session should still be cleared.
    } finally {
      disconnectSocket();
      clearSession();
      resetTorrentStore();
      resetSettingsStore();
      setConnectionStatus('disconnected');
    }
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={(
          <PublicOnly authStatus={authStatus} currentUser={currentUser}>
            <Login />
          </PublicOnly>
        )}
      />

      <Route element={<RequireAuth authStatus={authStatus} />}>
        <Route
          element={(
            <AppLayout
              connectionStatus={connectionStatus}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          )}
        >
          <Route path="/account" element={<Account />} />
          <Route path="/" element={<RequireResolvedPassword currentUser={currentUser}><Dashboard /></RequireResolvedPassword>} />
          <Route path="/add" element={<RequireResolvedPassword currentUser={currentUser}><AddTorrent /></RequireResolvedPassword>} />
          <Route path="/torrents/:id" element={<RequireResolvedPassword currentUser={currentUser}><TorrentDetails /></RequireResolvedPassword>} />
          <Route path="/media" element={<RequireResolvedPassword currentUser={currentUser}><MediaLibrary /></RequireResolvedPassword>} />
          <Route path="/media/:torrentId/:fileId" element={<RequireResolvedPassword currentUser={currentUser}><VideoPlayerPage /></RequireResolvedPassword>} />
          <Route
            path="/system"
            element={(
              <RequireResolvedPassword currentUser={currentUser}>
                <RequireAdmin currentUser={currentUser}>
                  <SystemUsage />
                </RequireAdmin>
              </RequireResolvedPassword>
            )}
          />
          <Route
            path="/settings"
            element={(
              <RequireResolvedPassword currentUser={currentUser}>
                <RequireAdmin currentUser={currentUser}>
                  <Settings />
                </RequireAdmin>
              </RequireResolvedPassword>
            )}
          />
          <Route path="*" element={<RequireResolvedPassword currentUser={currentUser}><NotFound /></RequireResolvedPassword>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={authStatus === 'authenticated' ? '/' : '/login'} replace />} />
    </Routes>
  );
}
