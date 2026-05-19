import {
  Clapperboard,
  Cpu,
  Download,
  LayoutDashboard,
  PlusSquare,
  Settings
} from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/add', label: 'Add Torrent', icon: PlusSquare },
  { to: '/media', label: 'Media', icon: Clapperboard },
  { to: '/system', label: 'System Usage', icon: Cpu },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export const STATUS_STYLES = {
  downloading: 'bg-highlight/15 text-highlight ring-1 ring-highlight/30',
  checking: 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20',
  queued: 'bg-white/10 text-ink ring-1 ring-white/10',
  completed: 'bg-accent/15 text-accent ring-1 ring-accent/30',
  paused: 'bg-warning/15 text-warning ring-1 ring-warning/30',
  stopped: 'bg-slate-500/20 text-slate-200 ring-1 ring-slate-400/25',
  failed: 'bg-danger/15 text-danger ring-1 ring-danger/30',
  needs_resume: 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/25'
};

export const VIDEO_SHORTCUTS = [
  'Space: play or pause',
  'ArrowRight: forward 10 seconds',
  'ArrowLeft: backward 10 seconds',
  'ArrowUp: volume up',
  'ArrowDown: volume down',
  'M: mute or unmute',
  'F: fullscreen',
  'D: download video'
];

export const DOWNLOADABLE_STATUSES = new Set(['completed']);
