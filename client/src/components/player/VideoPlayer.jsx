import { useEffect, useRef, useState } from 'react';
import { Download, Film } from 'lucide-react';
import Button from '../common/Button.jsx';
import PlayerControls from './PlayerControls.jsx';

const AUTO_HIDE_DELAY = 2200;

function getActiveCueLines(track) {
  return Array.from(track?.activeCues || [])
    .flatMap((cue) => String(cue?.text || '').split(/\r?\n/g))
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function VideoPlayer({
  source,
  title,
  downloadUrl,
  isPlayable,
  subtitleTracks = [],
  selectedSubtitleId = '',
  subtitleLoading = false,
  subtitleUploading = false,
  subtitleMessage = '',
  supportsSubtitles = false,
  onSubtitleChange,
  onSubtitleFileSelect
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const controlsContainerRef = useRef(null);
  const suppressToggleOnNextClickRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [activeSubtitleLines, setActiveSubtitleLines] = useState([]);
  const [controlsHeight, setControlsHeight] = useState(0);

  function showControlsTemporarily() {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (videoRef.current && !videoRef.current.paused) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), AUTO_HIDE_DELAY);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    const syncState = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      setVolume(video.volume);
      setIsMuted(video.muted);
      setIsPlaying(!video.paused);
    };

    syncState();
    video.addEventListener('timeupdate', syncState);
    video.addEventListener('loadedmetadata', syncState);
    video.addEventListener('play', syncState);
    video.addEventListener('pause', syncState);
    video.addEventListener('volumechange', syncState);
    video.addEventListener('ratechange', syncState);

    return () => {
      video.removeEventListener('timeupdate', syncState);
      video.removeEventListener('loadedmetadata', syncState);
      video.removeEventListener('play', syncState);
      video.removeEventListener('pause', syncState);
      video.removeEventListener('volumechange', syncState);
      video.removeEventListener('ratechange', syncState);
    };
  }, []);

  useEffect(() => () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const controlsElement = controlsContainerRef.current;
    if (!controlsElement) {
      return undefined;
    }

    const updateControlsHeight = () => {
      setControlsHeight(Math.ceil(controlsElement.getBoundingClientRect().height || 0));
    };

    updateControlsHeight();

    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(() => {
        updateControlsHeight();
      });

      resizeObserver.observe(controlsElement);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', updateControlsHeight);
    return () => window.removeEventListener('resize', updateControlsHeight);
  }, [supportsSubtitles, subtitleMessage, subtitleTracks.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    setActiveSubtitleLines([]);
    const textTracks = Array.from(video.textTracks || []);
    textTracks.forEach((track) => {
      track.mode = 'disabled';
    });

    if (!subtitleTracks.length || !selectedSubtitleId) {
      return undefined;
    }

    const selectedTrackIndex = subtitleTracks.findIndex((track) => track.id === selectedSubtitleId);
    const selectedTrack = selectedTrackIndex >= 0 ? textTracks[selectedTrackIndex] : null;

    if (!selectedTrack) {
      return undefined;
    }

    const syncActiveSubtitle = () => {
      setActiveSubtitleLines(getActiveCueLines(selectedTrack));
    };

    selectedTrack.mode = 'hidden';
    syncActiveSubtitle();
    selectedTrack.addEventListener?.('cuechange', syncActiveSubtitle);
    video.addEventListener('timeupdate', syncActiveSubtitle);
    video.addEventListener('seeked', syncActiveSubtitle);
    video.addEventListener('loadeddata', syncActiveSubtitle);

    return () => {
      selectedTrack.removeEventListener?.('cuechange', syncActiveSubtitle);
      video.removeEventListener('timeupdate', syncActiveSubtitle);
      video.removeEventListener('seeked', syncActiveSubtitle);
      video.removeEventListener('loadeddata', syncActiveSubtitle);
      selectedTrack.mode = 'disabled';
    };
  }, [selectedSubtitleId, source, subtitleTracks]);

  function handlePlayPause() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
      showControlsTemporarily();
    } else {
      video.pause();
      setControlsVisible(true);
    }
  }

  function handleVideoSurfaceClick() {
    if (suppressToggleOnNextClickRef.current) {
      suppressToggleOnNextClickRef.current = false;
      return;
    }

    handlePlayPause();
  }

  function handleVideoSurfaceTouchStart() {
    if (!controlsVisible) {
      suppressToggleOnNextClickRef.current = true;
      showControlsTemporarily();
    }
  }

  function handleSkip(seconds) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = Math.max(0, Math.min((video.duration || 0), video.currentTime + seconds));
    showControlsTemporarily();
  }

  function handleSeek(nextTime) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    showControlsTemporarily();
  }

  function handleVolume(nextVolume) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(video.muted);
    showControlsTemporarily();
  }

  function handleMute() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
    showControlsTemporarily();
  }

  function handleFullscreen() {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen();
    }
  }

  function handlePlaybackRate(nextRate) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    showControlsTemporarily();
  }

  function handleDownload() {
    window.location.assign(downloadUrl);
  }

  function handleKeyDown(event) {
    if (!focused) {
      return;
    }

    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea' || activeElement?.isContentEditable) {
      return;
    }

    switch (event.key) {
      case ' ':
        event.preventDefault();
        handlePlayPause();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleSkip(10);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handleSkip(-10);
        break;
      case 'ArrowUp':
        event.preventDefault();
        handleVolume(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        handleVolume(Math.max(0, volume - 0.1));
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        handleMute();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        handleFullscreen();
        break;
      case 'd':
      case 'D':
        event.preventDefault();
        handleDownload();
        break;
      default:
        break;
    }
  }

  if (!isPlayable) {
    return (
      <div className="glass-panel rounded-[30px] p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/6 text-highlight">
          <Film className="h-10 w-10" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-semibold text-white">{title}</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm text-subtle">
          Preview is not supported for this file. Please download it.
        </p>
        <Button as="a" href={downloadUrl} className="mt-6">
          <Download className="h-4 w-4" />
          Download file
        </Button>
      </div>
    );
  }

  const subtitleBottomOffset = controlsVisible
    ? Math.max(controlsHeight + 20, 24)
    : 24;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="glass-panel overflow-hidden rounded-[28px] p-2 outline-none sm:rounded-[34px] sm:p-4"
    >
      <div className="relative overflow-hidden rounded-[22px] bg-black sm:rounded-[28px]">
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          src={source}
          onClick={handleVideoSurfaceClick}
          onTouchStart={handleVideoSurfaceTouchStart}
          onPlay={showControlsTemporarily}
          onPause={() => setControlsVisible(true)}
          controls={false}
        >
          {subtitleTracks.map((track) => (
            <track
              key={track.id}
              kind="subtitles"
              src={track.url}
              srcLang={track.language || 'und'}
              label={track.label}
              default={track.id === selectedSubtitleId}
            />
          ))}
        </video>

        {activeSubtitleLines.length > 0 ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6 transition-all duration-200"
            style={{ bottom: `${subtitleBottomOffset}px` }}
          >
            <div className="max-w-4xl rounded-2xl bg-black/72 px-3 py-1.5 text-center text-xs font-medium leading-5 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm sm:leading-6 md:px-5 md:text-base">
              {activeSubtitleLines.map((line, index) => (
                <p key={`${index}-${line}`} className={index > 0 ? 'mt-1' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div
          ref={controlsContainerRef}
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 transition-opacity duration-200 sm:p-4',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          ].join(' ')}
        >
          <div className="pointer-events-auto">
            <PlayerControls
              isPlaying={isPlaying}
              isMuted={isMuted}
              volume={volume}
              currentTime={currentTime}
              duration={duration}
              playbackRate={playbackRate}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSkip={handleSkip}
              onMute={handleMute}
              onVolume={handleVolume}
              onFullscreen={handleFullscreen}
              onPlaybackRate={handlePlaybackRate}
              onDownload={handleDownload}
              subtitleTracks={subtitleTracks}
              selectedSubtitleId={selectedSubtitleId}
              subtitleLoading={subtitleLoading}
              subtitleUploading={subtitleUploading}
              subtitleMessage={subtitleMessage}
              supportsSubtitles={supportsSubtitles}
              onSubtitleChange={onSubtitleChange}
              onSubtitleFileSelect={onSubtitleFileSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
