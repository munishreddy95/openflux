import { create } from 'zustand';
import {
  DEFAULT_DESIGN_SETTINGS,
  applyDesignSettings,
  loadDesignSettings,
  persistDesignSettings,
  sanitizeDesignSettings
} from '../utils/design.js';

const initialSettings = sanitizeDesignSettings(loadDesignSettings());
applyDesignSettings(initialSettings);

function saveAndApplyDesignSettings(settings) {
  const safeSettings = sanitizeDesignSettings(settings);
  applyDesignSettings(safeSettings);
  persistDesignSettings(safeSettings);
  return safeSettings;
}

export const useDesignStore = create((set, get) => ({
  themeId: initialSettings.themeId,
  fontId: initialSettings.fontId,
  fontScale: initialSettings.fontScale,
  panelOpen: false,
  setThemeId: (themeId) =>
    set((state) => ({
      ...saveAndApplyDesignSettings({
        themeId,
        fontId: state.fontId,
        fontScale: state.fontScale
      })
    })),
  setFontId: (fontId) =>
    set((state) => ({
      ...saveAndApplyDesignSettings({
        themeId: state.themeId,
        fontId,
        fontScale: state.fontScale
      })
    })),
  setFontScale: (fontScale) =>
    set((state) => ({
      ...saveAndApplyDesignSettings({
        themeId: state.themeId,
        fontId: state.fontId,
        fontScale
      })
    })),
  resetDesignSettings: () =>
    set({
      ...saveAndApplyDesignSettings(DEFAULT_DESIGN_SETTINGS)
    }),
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
  syncWithStorage: () => {
    const nextSettings = loadDesignSettings();
    applyDesignSettings(nextSettings);
    set({
      themeId: nextSettings.themeId,
      fontId: nextSettings.fontId,
      fontScale: nextSettings.fontScale
    });
  },
  getCurrentSettings: () => sanitizeDesignSettings({
    themeId: get().themeId,
    fontId: get().fontId,
    fontScale: get().fontScale
  })
}));
