import { formatPercent } from '../../utils/format.js';

export default function TorrentProgress({ progress }) {
  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-highlight to-accent transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-subtle">
        <span>Transfer progress</span>
        <span>{formatPercent(progress || 0)}</span>
      </div>
    </div>
  );
}
