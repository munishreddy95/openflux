import { Link, useLocation } from 'react-router-dom';
import { Plus, Wifi, WifiOff } from 'lucide-react';
import Button from '../common/Button.jsx';

const titles = {
  '/': 'Dashboard',
  '/add': 'Add Torrent',
  '/media': 'Media Library',
  '/system': 'System Usage',
  '/settings': 'Settings'
};

function getPageTitle(pathname) {
  if (pathname.startsWith('/torrents/')) {
    return 'Torrent Details';
  }

  if (pathname.startsWith('/media/')) {
    return 'Video Player';
  }

  return titles[pathname] || 'OpenFlux';
}

export default function Header({ connectionStatus }) {
  const location = useLocation();
  const connected = connectionStatus === 'connected';

  return (
    <header className="glass-panel sticky top-4 z-20 rounded-[28px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-highlight/80">OpenFlux Console</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
            {getPageTitle(location.pathname)}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={[
              'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium',
              connected
                ? 'border-accent/25 bg-accent/10 text-accent'
                : 'border-danger/25 bg-danger/10 text-danger'
            ].join(' ')}
          >
            {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connected ? 'Live updates active' : 'Live updates reconnecting'}
          </div>
          <Button as={Link} to="/add">
            <Plus className="h-4 w-4" />
            Add torrent
          </Button>
        </div>
      </div>
    </header>
  );
}
