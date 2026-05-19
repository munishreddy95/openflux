import { STATUS_STYLES } from '../../utils/constants.js';
import { formatStatusLabel } from '../../utils/format.js';

export default function StatusBadge({ status }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        STATUS_STYLES[status] || 'bg-white/10 text-subtle ring-1 ring-white/10'
      ].join(' ')}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
