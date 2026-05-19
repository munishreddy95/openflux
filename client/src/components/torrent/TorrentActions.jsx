import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Pause, Play, Trash2, Tv, Waypoints } from 'lucide-react';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import { deleteTorrent as deleteTorrentRequest, pauseTorrent as pauseTorrentRequest, resumeTorrent as resumeTorrentRequest } from '../../services/torrent.api.js';
import { fetchMediaLibrary } from '../../services/media.api.js';
import { useTorrentStore } from '../../store/torrent.store.js';
import { getApiError } from '../../services/api.service.js';

function isAvailableFile(file) {
  const size = Number(file?.size) || 0;
  return Boolean(file?.isAvailable) || size === 0 || Number(file?.progress) >= 100 || Number(file?.downloaded) >= size;
}

export default function TorrentActions({ torrent, className }) {
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const removeTorrent = useTorrentStore((state) => state.removeTorrent);
  const setMedia = useTorrentStore((state) => state.setMedia);
  const [busyAction, setBusyAction] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [error, setError] = useState('');

  const firstVideoFile = (torrent.files || []).find((file) => file.isVideo && isAvailableFile(file));
  const firstFile = (torrent.files || []).find((file) => isAvailableFile(file));
  const canPause = ['downloading', 'checking'].includes(torrent.status);
  const canResume = ['paused', 'needs_resume', 'failed', 'stopped', 'queued'].includes(torrent.status);

  async function handlePause() {
    setBusyAction('pause');
    setError('');
    try {
      const nextTorrent = await pauseTorrentRequest(torrent.id);
      upsertTorrent(nextTorrent);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResume() {
    setBusyAction('resume');
    setError('');
    try {
      const nextTorrent = await resumeTorrentRequest(torrent.id);
      upsertTorrent(nextTorrent);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    setBusyAction('delete');
    setError('');
    try {
      await deleteTorrentRequest(torrent.id, deleteFiles);
      removeTorrent(torrent.id);
      setMedia(await fetchMediaLibrary());
      setDeleteOpen(false);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <div className={['space-y-3', className].filter(Boolean).join(' ')}>
        <div className="flex flex-wrap gap-2">
          {canPause ? (
            <Button variant="secondary" size="sm" onClick={handlePause} disabled={busyAction !== null}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          ) : null}

          {canResume ? (
            <Button variant="secondary" size="sm" onClick={handleResume} disabled={busyAction !== null}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
          ) : null}

          <Button as={Link} to={`/torrents/${torrent.id}`} variant="ghost" size="sm">
            <Waypoints className="h-4 w-4" />
            Details
          </Button>

          {firstVideoFile ? (
            <Button as={Link} to={`/media/${torrent.id}/${firstVideoFile.id}`} variant="ghost" size="sm">
              <Tv className="h-4 w-4" />
              Watch
            </Button>
          ) : null}

          {firstFile ? (
            <Button
              as="a"
              href={`/api/media/${torrent.id}/files/${firstFile.id}/download`}
              variant="ghost"
              size="sm"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          ) : null}

          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)} disabled={busyAction !== null}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <Modal
        open={deleteOpen}
        title="Delete torrent?"
        description="Remove this torrent from OpenFlux. Optionally delete downloaded files from disk as well."
        confirmLabel="Delete torrent"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        busy={busyAction === 'delete'}
      >
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-subtle">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(event) => setDeleteFiles(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-danger focus:ring-danger/30"
          />
          Delete downloaded files from storage
        </label>
      </Modal>
    </>
  );
}
