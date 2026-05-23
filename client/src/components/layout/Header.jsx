import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, LogOut, Plus, Wifi, WifiOff } from 'lucide-react';
import Button from '../common/Button.jsx';

const titles = {
  '/': 'Dashboard',
  '/add': 'Add Torrent',
  '/media': 'Media Library',
  '/account': 'Account',
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

export default function Header({ connectionStatus, currentUser, onLogout }) {
  const location = useLocation();
  const connected = connectionStatus === 'connected';
  const requiresPasswordChange = Boolean(currentUser?.mustChangePassword);

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
              requiresPasswordChange
                ? 'border-warning/25 bg-warning/10 text-warning'
                : (connected
                  ? 'border-accent/25 bg-accent/10 text-accent'
                  : 'border-danger/25 bg-danger/10 text-danger')
            ].join(' ')}
          >
            {requiresPasswordChange ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />)}
            {requiresPasswordChange
              ? 'Password update required'
              : (connected ? 'Live updates active' : 'Live updates reconnecting')}
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white sm:inline-flex">
            {currentUser?.username} · {currentUser?.role}
          </div>
          {!requiresPasswordChange ? (
            <Button as={Link} to="/add">
              <Plus className="h-4 w-4" />
              Add torrent
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
