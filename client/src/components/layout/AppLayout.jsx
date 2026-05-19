import { NavLink, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import DesignSettingsPanel from './DesignSettingsPanel.jsx';
import { NAV_ITEMS } from '../../utils/constants.js';

function mobileClass({ isActive }) {
  return [
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs transition',
    isActive ? 'bg-white/10 text-white' : 'text-subtle hover:text-white'
  ].join(' ');
}

export default function AppLayout({ connectionStatus }) {
  return (
    <div className="app-shell px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] gap-6">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4 pb-24 lg:pb-6">
          <Header connectionStatus={connectionStatus} />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      <DesignSettingsPanel />

      <nav className="glass-panel fixed bottom-4 left-4 right-4 z-30 mx-auto flex max-w-xl rounded-[28px] p-2 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className={mobileClass}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
