import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import Button from '../common/Button.jsx';
import StatusBadge from '../torrent/StatusBadge.jsx';
import { formatBytes, formatPercent } from '../../utils/format.js';
import { getDownloadUrl } from '../../services/media.api.js';
import { updateTorrentFileMode } from '../../services/torrent.api.js';
import { getApiError } from '../../services/api.service.js';
import { useTorrentStore } from '../../store/torrent.store.js';

function isAvailableFile(file) {
  const size = Number(file?.size) || 0;
  return Boolean(file?.isAvailable) || size === 0 || Number(file?.progress) >= 100 || Number(file?.downloaded) >= size;
}

export default function FileList({ torrent }) {
  const files = torrent.files || [];
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const [busyFileId, setBusyFileId] = useState(null);
  const [error, setError] = useState('');

  function getFileMode(file) {
    return file.wanted === false ? 'skip' : (file.priority || 'normal');
  }

  async function handleModeChange(file, nextMode) {
    setBusyFileId(file.id);
    setError('');

    try {
      const nextTorrent = await updateTorrentFileMode(torrent.id, file.id, {
        wanted: nextMode !== 'skip',
        ...(nextMode !== 'skip' ? { priority: nextMode } : {})
      });
      upsertTorrent(nextTorrent);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusyFileId(null);
    }
  }

  if (!files.length) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/4 p-5 text-sm text-subtle">
        File metadata will appear here once the torrent has been inspected.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)_160px_120px_130px] gap-4 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.18em] text-subtle">
        <span>File</span>
        <span>Progress</span>
        <span>Mode</span>
        <span>Size</span>
        <span>Actions</span>
      </div>

      {error ? (
        <div className="border-b border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {files.map((file) => (
        <div
          key={file.id}
          className="grid grid-cols-1 gap-4 border-b border-white/8 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_160px_120px_130px]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{file.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {file.wanted === false ? (
                <span className="inline-flex items-center rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning ring-1 ring-warning/30">
                  Skipped
                </span>
              ) : isAvailableFile(file) ? (
                <StatusBadge status="completed" />
              ) : null}
              <span className="text-xs text-subtle">{file.mimeType}</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-highlight to-accent transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, file.progress || 0))}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-subtle">
              <span>
                {formatBytes(file.downloaded || 0)} of {formatBytes(file.size)}
              </span>
              <span>{formatPercent(file.progress || 0)}</span>
            </div>
          </div>
          <div className="min-w-0">
            <select
              value={getFileMode(file)}
              onChange={(event) => {
                void handleModeChange(file, event.target.value);
              }}
              disabled={busyFileId === file.id}
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none transition focus:border-highlight/40 focus:ring-2 focus:ring-highlight/20 disabled:opacity-60"
            >
              <option value="skip" className="bg-slate-900">Don&apos;t download</option>
              <option value="low" className="bg-slate-900">Low priority</option>
              <option value="normal" className="bg-slate-900">Normal priority</option>
              <option value="high" className="bg-slate-900">High priority</option>
            </select>
            <p className="mt-2 text-xs text-subtle">
              {busyFileId === file.id
                ? 'Saving selection...'
                : file.wanted === false
                  ? 'Excluded from future download'
                  : `Priority: ${file.priority || 'normal'}`}
            </p>
          </div>
          <div className="text-sm text-subtle">{formatBytes(file.size)}</div>
          <div className="flex gap-2">
            {file.isVideo && isAvailableFile(file) ? (
              <Button as={Link} to={`/media/${torrent.id}/${file.id}`} variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            ) : null}
            {isAvailableFile(file) ? (
              <Button as="a" href={getDownloadUrl(torrent.id, file.id)} variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
