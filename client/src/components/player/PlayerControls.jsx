import { Maximize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { formatDuration } from '../../utils/format.js';

export default function PlayerControls({
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onSeek,
  onSkip,
  onMute,
  onVolume,
  onFullscreen,
  onPlaybackRate,
  onDownload,
  subtitleTracks = [],
  selectedSubtitleId = '',
  subtitleLoading = false,
  subtitleUploading = false,
  subtitleMessage = '',
  supportsSubtitles = false,
  onSubtitleChange,
  onSubtitleFileSelect
}) {
  return (
    <div className="rounded-[20px] bg-slate-950/80 p-3 backdrop-blur sm:rounded-[24px] sm:p-4">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step="0.1"
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-highlight"
      />

      <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSkip(-10)}
            className="rounded-2xl bg-white/8 p-2.5 text-white transition hover:bg-white/12 sm:p-3"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onPlayPause}
            className="rounded-2xl bg-highlight p-2.5 text-slate-950 transition hover:bg-highlight/90 sm:p-3"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => onSkip(10)}
            className="rounded-2xl bg-white/8 p-2.5 text-white transition hover:bg-white/12 sm:p-3"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onMute}
            className="rounded-2xl bg-white/8 p-2.5 text-white transition hover:bg-white/12 sm:p-3"
          >
            {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step="0.05"
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
            className="order-last h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-accent sm:order-none sm:w-28"
          />
          <span className="w-full text-xs text-subtle sm:w-auto sm:text-sm">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select
            value={playbackRate}
            onChange={(event) => onPlaybackRate(Number(event.target.value))}
            className="min-w-0 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none"
          >
            {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
              <option key={rate} value={rate} className="bg-slate-900">
                {rate}x
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-2xl bg-white/8 px-3 py-2 text-sm text-white transition hover:bg-white/12 sm:px-4"
          >
            Download
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            className="rounded-2xl bg-white/8 p-2.5 text-white transition hover:bg-white/12 sm:p-3"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>

      {supportsSubtitles ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <span className="text-xs uppercase tracking-[0.18em] text-subtle">Subtitles</span>
            <select
              value={selectedSubtitleId}
              onChange={(event) => onSubtitleChange?.(event.target.value)}
              className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none sm:min-w-[180px] sm:w-auto"
            >
              <option value="" className="bg-slate-900">Off</option>
              {subtitleTracks.map((track) => (
                <option key={track.id} value={track.id} className="bg-slate-900">
                  {track.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-subtle">
              {subtitleLoading
                ? 'Scanning subtitle tracks...'
                : `${subtitleTracks.length} track${subtitleTracks.length === 1 ? '' : 's'} available`}
            </span>
          </div>

          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/8 px-4 py-2 text-sm text-white transition hover:bg-white/12 sm:w-auto">
            <input
              type="file"
              accept=".srt,.vtt,.webvtt"
              className="hidden"
              disabled={subtitleUploading}
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (file) {
                  onSubtitleFileSelect?.(file);
                }
                event.target.value = '';
              }}
            />
            {subtitleUploading ? 'Uploading subtitle...' : 'Upload subtitle'}
          </label>
        </div>
      ) : null}

      {supportsSubtitles && subtitleMessage ? (
        <p className="mt-3 text-xs text-subtle sm:text-sm">{subtitleMessage}</p>
      ) : null}
    </div>
  );
}
