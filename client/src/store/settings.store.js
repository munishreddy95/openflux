import { create } from 'zustand';

export const useSettingsStore = create((set) => ({
  settings: null,
  loading: false,
  error: null,
  setSettings: (settings) => set({ settings }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
