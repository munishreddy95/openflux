import { CircleAlert, LibraryBig, PackagePlus } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';
import TorrentCard from '../components/torrent/TorrentCard.jsx';
import { useTorrentStore } from '../store/torrent.store.js';

function SummaryCard({ label, value, tone }) {
  const tones = {
    default: 'text-white',
    accent: 'text-accent',
    warning: 'text-warning',
    danger: 'text-danger'
  };

  return (
    <div className="glass-panel rounded-[26px] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-subtle">{label}</p>
      <p className={['mt-3 text-4xl font-semibold', tones[tone] || tones.default].join(' ')}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const torrents = useTorrentStore((state) => state.torrents);
  const active = torrents.filter((torrent) => ['downloading', 'checking', 'queued'].includes(torrent.status));
  const completed = torrents.filter((torrent) => torrent.status === 'completed');
  const attention = torrents.filter((torrent) => ['failed', 'needs_resume', 'paused', 'stopped'].includes(torrent.status));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Active transfers" value={active.length} tone="accent" />
        <SummaryCard label="Completed items" value={completed.length} tone="default" />
        <SummaryCard label="Needs attention" value={attention.length} tone={attention.length ? 'warning' : 'default'} />
      </section>

      {torrents.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="No torrents yet"
          description="Add a magnet link or upload a .torrent file to start downloading legal content into your OpenFlux storage folder."
          actionLabel="Add first torrent"
          actionTo="/add"
        />
      ) : null}

      {active.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-semibold text-white">In progress</h3>
            <span className="text-sm text-subtle">{active.length} active or queued</span>
          </div>
          <div className="space-y-4">
            {active.map((torrent) => (
              <TorrentCard key={torrent.id} torrent={torrent} />
            ))}
          </div>
        </section>
      ) : null}

      {attention.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <CircleAlert className="h-5 w-5 text-warning" />
            <h3 className="font-display text-2xl font-semibold text-white">Needs attention</h3>
          </div>
          <div className="space-y-4">
            {attention.map((torrent) => (
              <TorrentCard key={torrent.id} torrent={torrent} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <LibraryBig className="h-5 w-5 text-highlight" />
            <h3 className="font-display text-2xl font-semibold text-white">Completed</h3>
          </div>
          <div className="space-y-4">
            {completed.map((torrent) => (
              <TorrentCard key={torrent.id} torrent={torrent} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
