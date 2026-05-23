import { formatPercent, formatSpeed, formatStatusLabel } from '../../utils/format.js';

const statusTones = {
  downloading: 'text-accent',
  completed: 'text-highlight',
  paused: 'text-warning',
  failed: 'text-danger',
  stopped: 'text-danger',
  needs_resume: 'text-warning',
  queued: 'text-subtle',
  checking: 'text-highlight'
};

export default function TorrentProgress({
  progress,
  status,
  downloadSpeed,
  uploadSpeed,
  connectedPeers,
  totalPeers,
  showTransferSummary = true
}) {
  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-highlight to-accent transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle sm:grid sm:grid-cols-[auto_auto_auto_1fr] sm:gap-2">
        <span>Transfer progress</span>
        {showTransferSummary ? (
          <span className="whitespace-nowrap">
            ↓ {formatSpeed(downloadSpeed)} • ↑ {formatSpeed(uploadSpeed)} • {connectedPeers ?? 0}/{totalPeers ?? connectedPeers ?? 0} peers
          </span>
        ) : (
          <span />
        )}
        <span className={['justify-self-center font-medium', statusTones[status] || 'text-white/80'].join(' ')}>
          {formatStatusLabel(status || 'unknown')}
        </span>
        <span className="whitespace-nowrap sm:justify-self-end">{formatPercent(progress || 0)}</span>
      </div>
    </div>
  );
}
