import { useState } from 'react';
import { ChevronDown, Clock3, HardDriveDownload, Network, UploadCloud, Users } from 'lucide-react';
import TorrentProgress from './TorrentProgress.jsx';
import TorrentActions from './TorrentActions.jsx';
import { formatBytes, formatDate, formatDuration, formatETA, formatSpeed } from '../../utils/format.js';

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-subtle">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function TorrentCard({ torrent }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const connectedPeers = torrent.connectedPeers ?? torrent.peers ?? 0;
  const totalPeers = torrent.peersTotal ?? connectedPeers;

  return (
    <details
      className="group glass-panel rounded-[28px]"
      onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
    >
      <summary className="list-none cursor-pointer px-4 py-4 sm:px-5 sm:py-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words font-display text-lg font-semibold leading-tight text-white sm:text-xl">
              {torrent.name}
            </h3>
          </div>
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-white/80 transition-transform duration-200 group-open:rotate-180" />
        </div>

        <div className="mt-4">
          <TorrentProgress
            progress={torrent.progress}
            status={torrent.status}
            downloadSpeed={torrent.downloadSpeed}
            uploadSpeed={torrent.uploadSpeed}
            connectedPeers={connectedPeers}
            totalPeers={totalPeers}
            showTransferSummary={!detailsOpen}
          />
        </div>
      </summary>

      <div className="border-t border-white/8 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-1.5 text-subtle sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm">
            {formatBytes(torrent.downloaded)} of {formatBytes(torrent.totalSize)} transferred
          </p>
          <p className="text-xs uppercase tracking-[0.18em] sm:text-right">
            Updated {formatDate(torrent.updatedAt)}
          </p>
        </div>

        <div className="metric-grid mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Metric icon={HardDriveDownload} label="Download" value={formatSpeed(torrent.downloadSpeed)} />
          <Metric icon={UploadCloud} label="Upload" value={formatSpeed(torrent.uploadSpeed)} />
          <Metric icon={Users} label="Peers live/known" value={`${connectedPeers} / ${totalPeers}`} />
          <Metric icon={Network} label="ETA" value={formatETA(torrent.eta)} />
          <Metric icon={Clock3} label="Active time" value={formatDuration(torrent.activeTimeElapsed)} />
        </div>

        <div className="mt-3">
          <TorrentActions torrent={torrent} />
        </div>
      </div>
    </details>
  );
}
