import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Clock3, FolderArchive, Timer, Users } from 'lucide-react';
import Loading from '../components/common/Loading.jsx';
import PeerList from '../components/torrent/PeerList.jsx';
import TorrentActions from '../components/torrent/TorrentActions.jsx';
import TorrentProgress from '../components/torrent/TorrentProgress.jsx';
import StatusBadge from '../components/torrent/StatusBadge.jsx';
import FileList from '../components/media/FileList.jsx';
import { fetchTorrent } from '../services/torrent.api.js';
import { getApiError } from '../services/api.service.js';
import { useTorrentStore } from '../store/torrent.store.js';
import { formatBytes, formatDate, formatDuration, formatETA, formatSpeed } from '../utils/format.js';

function DetailMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-subtle">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-base font-medium text-white">{value}</p>
    </div>
  );
}

export default function TorrentDetails() {
  const { id } = useParams();
  const storeTorrent = useTorrentStore((state) => state.getTorrentById(id));
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const [torrent, setTorrent] = useState(storeTorrent);
  const [loading, setLoading] = useState(!storeTorrent);
  const [error, setError] = useState('');

  useEffect(() => {
    setTorrent(storeTorrent);
  }, [storeTorrent]);

  useEffect(() => {
    if (storeTorrent) {
      return undefined;
    }

    let cancelled = false;

    async function loadTorrent() {
      setLoading(true);
      setError('');
      try {
        const nextTorrent = await fetchTorrent(id);
        if (!cancelled) {
          setTorrent(nextTorrent);
          upsertTorrent(nextTorrent);
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

    void loadTorrent();

    return () => {
      cancelled = true;
    };
  }, [id, storeTorrent, upsertTorrent]);

  if (loading && !torrent) {
    return <Loading label="Loading torrent details..." />;
  }

  if (!torrent) {
    return (
      <div className="glass-panel rounded-[30px] p-8">
        <p className="text-sm text-danger">{error || 'Torrent not found'}</p>
      </div>
    );
  }

  const connectedPeers = torrent.connectedPeers ?? torrent.peers ?? 0;
  const totalPeers = torrent.peersTotal ?? connectedPeers;
  const connectedSeeders = torrent.connectedSeeders ?? torrent.seeds ?? 0;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={torrent.status} />
              <span className="text-xs uppercase tracking-[0.18em] text-subtle">Created {formatDate(torrent.createdAt)}</span>
            </div>
            <h3 className="mt-4 break-words font-display text-3xl font-semibold text-white">{torrent.name}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-subtle">
              {torrent.sourceType === 'magnet'
                ? 'Magnet metadata is stored so this torrent can be resumed manually after restarts.'
                : 'Uploaded torrent file is stored safely inside the OpenFlux upload directory for manual resume.'}
            </p>
          </div>
          <TorrentActions torrent={torrent} />
        </div>

        <div className="mt-8">
          <TorrentProgress progress={torrent.progress} />
        </div>

        <div className="metric-grid mt-8 grid gap-4">
          <DetailMetric icon={Activity} label="Download speed" value={formatSpeed(torrent.downloadSpeed)} />
          <DetailMetric icon={Activity} label="Upload speed" value={formatSpeed(torrent.uploadSpeed)} />
          <DetailMetric icon={Timer} label="ETA" value={formatETA(torrent.eta)} />
          <DetailMetric icon={Users} label="Peers connected" value={connectedPeers} />
          <DetailMetric icon={Users} label="Peers discovered" value={totalPeers} />
          <DetailMetric icon={Users} label="Seeders connected" value={connectedSeeders} />
          <DetailMetric icon={Clock3} label="Active time" value={formatDuration(torrent.activeTimeElapsed)} />
          <DetailMetric icon={FolderArchive} label="Downloaded" value={formatBytes(torrent.downloaded)} />
          <DetailMetric icon={FolderArchive} label="Total size" value={formatBytes(torrent.totalSize)} />
        </div>

        {torrent.error ? <p className="mt-6 text-sm text-danger">{torrent.error}</p> : null}
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div>
          <h3 className="font-display text-2xl font-semibold text-white">Peer activity</h3>
          <p className="mt-2 text-sm text-subtle">
            Live peer connections, current transfer rates, and which of those connections are complete seeders.
          </p>
        </div>
        <div className="mt-6">
          <PeerList torrent={torrent} />
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Files</h3>
            <p className="mt-2 text-sm text-subtle">
              {torrent.status === 'completed'
                ? 'Available files can be streamed or downloaded from here.'
                : 'Use the mode dropdown to skip files or raise their download priority as metadata becomes available.'}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <FileList torrent={torrent} />
        </div>
      </section>
    </div>
  );
}
