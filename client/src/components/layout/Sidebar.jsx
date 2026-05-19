import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../utils/constants.js';

function navClass({ isActive }) {
  return [
    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
    isActive
      ? 'bg-white/10 text-white shadow-glow'
      : 'text-subtle hover:bg-white/6 hover:text-white'
  ].join(' ');
}

export default function Sidebar() {
  return (
    <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col self-start overflow-y-auto rounded-[32px] p-6 lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-highlight/80">OpenFlux</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white">Torrent control, kept local.</h1>
        <p className="mt-3 text-sm leading-6 text-subtle">
          Add legal torrents, monitor progress in real time, and stream completed video files from a single server UI.
        </p>
      </div>

      <nav className="mt-10 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[26px] border border-accent/15 bg-accent/8 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-accent/80">Legal use only</p>
        <p className="mt-3 text-sm leading-6 text-subtle">
          OpenFlux intentionally excludes search, scraping, and piracy shortcuts. Bring your own magnet links and torrent files.
        </p>
      </div>
    </aside>
  );
}
