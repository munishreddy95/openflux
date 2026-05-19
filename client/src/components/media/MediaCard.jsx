import { Link } from 'react-router-dom';
import { Download, Film } from 'lucide-react';
import Button from '../common/Button.jsx';
import { formatBytes } from '../../utils/format.js';
import { getDownloadUrl } from '../../services/media.api.js';

export default function MediaCard({ media }) {
  return (
    <article className="glass-panel rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight/10 text-highlight">
            <Film className="h-5 w-5" />
          </div>
          <h3 className="mt-4 truncate font-display text-xl font-semibold text-white">{media.name}</h3>
          <p className="mt-2 truncate text-sm text-subtle">{media.torrentName}</p>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-subtle">{media.mimeType}</span>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-subtle">
        <span>{formatBytes(media.size)}</span>
        <span>{media.isPlayable ? 'Browser preview ready' : 'Download-only preview'}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button as={Link} to={`/media/${media.torrentId}/${media.id}`} size="sm">
          Watch
        </Button>
        <Button as="a" href={getDownloadUrl(media.torrentId, media.id)} variant="ghost" size="sm">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </article>
  );
}
