import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Keyboard } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import VideoPlayer from '../components/player/VideoPlayer.jsx';
import {
  fetchMediaFiles,
  fetchMediaSubtitles,
  getDownloadUrl,
  getStreamUrl,
  getSubtitleTrackUrl,
  uploadMediaSubtitleFile
} from '../services/media.api.js';
import { useTorrentStore } from '../store/torrent.store.js';
import { getApiError } from '../services/api.service.js';
import { VIDEO_SHORTCUTS } from '../utils/constants.js';

export default function VideoPlayerPage() {
  const { torrentId, fileId } = useParams();
  const storeTorrent = useTorrentStore((state) => state.getTorrentById(torrentId));
  const [file, setFile] = useState(storeTorrent?.files?.find((item) => item.id === fileId) || null);
  const [loading, setLoading] = useState(!file);
  const [error, setError] = useState('');
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState('');
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleUploading, setSubtitleUploading] = useState(false);
  const [subtitleError, setSubtitleError] = useState('');
  const [subtitleSuccess, setSubtitleSuccess] = useState('');

  function applySubtitleTracks(nextTracks = [], preferredTrackId = '') {
    setSubtitleTracks(nextTracks);
    setSelectedSubtitleId((currentTrackId) => {
      if (preferredTrackId && nextTracks.some((track) => track.id === preferredTrackId)) {
        return preferredTrackId;
      }

      if (currentTrackId && nextTracks.some((track) => track.id === currentTrackId)) {
        return currentTrackId;
      }

      return nextTracks[0]?.id || '';
    });
  }

  useEffect(() => {
    setFile(storeTorrent?.files?.find((item) => item.id === fileId) || null);
  }, [fileId, storeTorrent, torrentId]);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      if (file) {
        return;
      }

      setLoading(true);
      setError('');
      try {
        const files = await fetchMediaFiles(torrentId);
        const nextFile = files.find((item) => item.id === fileId) || null;
        if (!cancelled) {
          setFile(nextFile);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [file, fileId, torrentId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSubtitles() {
      if (!file?.isVideo || !file?.isPlayable) {
        setSubtitleLoading(false);
        applySubtitleTracks([]);
        setSubtitleError('');
        setSubtitleSuccess('');
        return;
      }

      setSubtitleLoading(true);
      setSubtitleError('');

      try {
        const tracks = await fetchMediaSubtitles(torrentId, fileId);
        if (!cancelled) {
          applySubtitleTracks(tracks);
        }
      } catch (requestError) {
        if (!cancelled) {
          applySubtitleTracks([]);
          setSubtitleError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) {
          setSubtitleLoading(false);
        }
      }
    }

    void loadSubtitles();

    return () => {
      cancelled = true;
    };
  }, [file?.id, file?.isPlayable, file?.isVideo, fileId, torrentId]);

  async function handleSubtitleUpload(nextFile) {
    if (!nextFile) {
      return;
    }

    setSubtitleUploading(true);
    setSubtitleError('');
    setSubtitleSuccess('');

    try {
      const result = await uploadMediaSubtitleFile(torrentId, fileId, nextFile);
      applySubtitleTracks(result?.subtitles || [], result?.subtitle?.id);
      setSubtitleSuccess(`${result?.subtitle?.label || nextFile.name} loaded into the player.`);
    } catch (requestError) {
      setSubtitleError(getApiError(requestError));
    } finally {
      setSubtitleUploading(false);
    }
  }

  if (loading && !file) {
    return <div className="glass-panel rounded-[30px] p-8 text-sm text-subtle">Loading media file...</div>;
  }

  if (!file) {
    return (
      <div className="glass-panel rounded-[30px] p-8">
        <p className="text-sm text-danger">{error || 'Media file not found'}</p>
      </div>
    );
  }

  const streamUrl = getStreamUrl(torrentId, fileId);
  const downloadUrl = getDownloadUrl(torrentId, fileId);
  const playerSubtitleTracks = subtitleTracks.map((track) => ({
    ...track,
    url: getSubtitleTrackUrl(torrentId, fileId, track.id)
  }));
  const subtitleMessage = subtitleError
    || subtitleSuccess
    || (subtitleLoading ? 'Scanning subtitle tracks...' : '');
  const supportsSubtitles = file.isVideo && file.isPlayable;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button as={Link} to={`/torrents/${torrentId}`} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to torrent
          </Button>
          <h3 className="mt-4 break-words font-display text-2xl font-semibold text-white md:text-3xl">{file.name}</h3>
          <p className="mt-2 max-w-2xl text-sm text-subtle">Click the player once to focus it before using keyboard shortcuts.</p>
        </div>
        <Button as="a" href={downloadUrl} variant="secondary" className="w-full sm:w-auto">
          Download
        </Button>
      </div>

      <VideoPlayer
        source={streamUrl}
        title={file.name}
        downloadUrl={downloadUrl}
        isPlayable={file.isPlayable}
        subtitleTracks={playerSubtitleTracks}
        selectedSubtitleId={selectedSubtitleId}
        subtitleLoading={subtitleLoading}
        subtitleUploading={subtitleUploading}
        subtitleMessage={subtitleMessage}
        supportsSubtitles={supportsSubtitles}
        onSubtitleChange={setSelectedSubtitleId}
        onSubtitleFileSelect={(nextFile) => {
          setSubtitleError('');
          setSubtitleSuccess('');
          void handleSubtitleUpload(nextFile);
        }}
      />

      <section className="glass-panel rounded-[26px] p-4 sm:rounded-[30px] sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Keyboard shortcuts</h3>
            <p className="mt-1 text-sm text-subtle">Shortcuts are active only while the player area is focused.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {VIDEO_SHORTCUTS.map((shortcut) => (
            <div key={shortcut} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-subtle">
              {shortcut}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
