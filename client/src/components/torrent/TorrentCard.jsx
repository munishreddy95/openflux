import { Clock3, HardDriveDownload, Network, UploadCloud, Users } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import TorrentProgress from './TorrentProgress.jsx';
import TorrentActions from './TorrentActions.jsx';
import { formatBytes, formatDate, formatDuration, formatETA, formatSpeed } from '../../utils/format.js';

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-subtle">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function TorrentCard({ torrent }) {
  const connectedPeers = torrent.connectedPeers ?? torrent.peers ?? 0;
  const totalPeers = torrent.peersTotal ?? connectedPeers;

  return (
    <article className="glass-panel rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={torrent.status} />
            <span className="text-xs uppercase tracking-[0.2em] text-subtle">
              Updated {formatDate(torrent.updatedAt)}
            </span>
          </div>
          <h3 className="mt-3 line-clamp-2 font-display text-2xl font-semibold text-white">{torrent.name}</h3>
          <p className="mt-2 text-sm text-subtle">
            {formatBytes(torrent.downloaded)} of {formatBytes(torrent.totalSize)} transferred
          </p>
        </div>

        <TorrentActions torrent={torrent} className="xl:max-w-sm xl:items-end" />
      </div>

      <div className="mt-6">
        <TorrentProgress progress={torrent.progress} />
      </div>

      <div className="metric-grid mt-6 grid gap-3">
        <Metric icon={HardDriveDownload} label="Download" value={formatSpeed(torrent.downloadSpeed)} />
        <Metric icon={UploadCloud} label="Upload" value={formatSpeed(torrent.uploadSpeed)} />
        <Metric icon={Users} label="Peers live/known" value={`${connectedPeers} / ${totalPeers}`} />
        <Metric icon={Network} label="ETA" value={formatETA(torrent.eta)} />
        <Metric icon={Clock3} label="Active time" value={formatDuration(torrent.activeTimeElapsed)} />
      </div>
    </article>
  );
}
