import { useEffect } from 'react';
import { Check, Palette, RotateCcw, Settings, Type } from 'lucide-react';
import { useDesignStore } from '../../store/design.store.js';
import { FONT_PRESETS, FONT_SCALE_PRESETS, THEME_PRESETS } from '../../utils/design.js';

function cn(...values) {
  return values.filter(Boolean).join(' ');
}

function PresetButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-[24px] border p-4 text-left transition',
        active
          ? 'border-highlight/35 bg-highlight/10 shadow-glow'
          : 'border-white/10 bg-white/5 hover:bg-white/8'
      )}
    >
      {children}
    </button>
  );
}

export default function DesignSettingsPanel() {
  const themeId = useDesignStore((state) => state.themeId);
  const fontId = useDesignStore((state) => state.fontId);
  const fontScale = useDesignStore((state) => state.fontScale);
  const panelOpen = useDesignStore((state) => state.panelOpen);
  const setThemeId = useDesignStore((state) => state.setThemeId);
  const setFontId = useDesignStore((state) => state.setFontId);
  const setFontScale = useDesignStore((state) => state.setFontScale);
  const togglePanel = useDesignStore((state) => state.togglePanel);
  const closePanel = useDesignStore((state) => state.closePanel);
  const resetDesignSettings = useDesignStore((state) => state.resetDesignSettings);

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closePanel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel, panelOpen]);

  return (
    <>
      {panelOpen ? (
        <button
          type="button"
          aria-label="Close design settings"
          onClick={closePanel}
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
        />
      ) : null}

      <div
        className={cn(
          'glass-panel fixed inset-x-4 bottom-24 z-40 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain rounded-[30px] p-5 transition-all duration-300 sm:inset-x-auto sm:right-20 sm:top-1/2 sm:bottom-auto sm:max-h-[calc(100vh-2rem)] sm:w-[320px] sm:max-w-[calc(100vw-7rem)] sm:-translate-y-1/2',
          panelOpen
            ? 'translate-y-0 opacity-100 sm:translate-x-0'
            : 'pointer-events-none translate-y-6 opacity-0 sm:translate-x-8'
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-highlight/80">Design settings</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-white">Customize the shell</h3>
          </div>
          <button
            type="button"
            onClick={resetDesignSettings}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-subtle transition hover:bg-white/8 hover:text-white"
            aria-label="Reset design settings"
            title="Reset to default design"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-subtle">
            <Palette className="h-4 w-4" />
            Background tone
          </div>
          <div className="mt-3 space-y-3">
            {THEME_PRESETS.map((theme) => (
              <PresetButton key={theme.id} active={themeId === theme.id} onClick={() => setThemeId(theme.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-white">{theme.name}</p>
                    <p className="mt-1 text-sm leading-6 text-subtle">{theme.description}</p>
                  </div>
                  {themeId === theme.id ? <Check className="mt-1 h-4 w-4 text-highlight" /> : null}
                </div>
                <div className="mt-4 flex gap-2">
                  {theme.swatches.map((swatch) => (
                    <span
                      key={`${theme.id}-${swatch}`}
                      className="h-4 w-8 rounded-full ring-1 ring-white/10"
                      style={{ backgroundColor: `rgb(${swatch.replaceAll(' ', ', ')})` }}
                    />
                  ))}
                </div>
              </PresetButton>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-subtle">
            <Type className="h-4 w-4" />
            Font family
          </div>
          <div className="mt-3 space-y-3">
            {FONT_PRESETS.map((font) => (
              <PresetButton key={font.id} active={fontId === font.id} onClick={() => setFontId(font.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-white">{font.name}</p>
                    <p className="mt-1 text-sm leading-6 text-subtle">{font.description}</p>
                  </div>
                  {fontId === font.id ? <Check className="mt-1 h-4 w-4 text-highlight" /> : null}
                </div>
              </PresetButton>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-subtle">
            <Type className="h-4 w-4" />
            Font size
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FONT_SCALE_PRESETS.map((scale) => (
              <PresetButton
                key={scale.value}
                active={fontScale === scale.value}
                onClick={() => setFontScale(scale.value)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-white">{scale.label}</p>
                    <p className="mt-1 text-sm leading-6 text-subtle">{scale.description}</p>
                  </div>
                  {fontScale === scale.value ? <Check className="mt-1 h-4 w-4 text-highlight" /> : null}
                </div>
              </PresetButton>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-subtle">Layout guardrail</p>
          <p className="mt-2 text-sm leading-6 text-subtle">
            Font sizing stays limited to <span className="font-semibold text-white">100%</span>,{' '}
            <span className="font-semibold text-white">75%</span>, and{' '}
            <span className="font-semibold text-white">50%</span> so the nav, sidebar, and content layout remain
            predictable.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePanel}
        aria-label={panelOpen ? 'Hide design settings' : 'Show design settings'}
        aria-pressed={panelOpen}
        className={cn(
          'glass-panel fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-[22px] transition sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2',
          panelOpen ? 'text-highlight' : 'text-subtle hover:text-white'
        )}
      >
        <Settings className={cn('h-5 w-5 transition-transform', panelOpen && 'rotate-90')} />
      </button>
    </>
  );
}
