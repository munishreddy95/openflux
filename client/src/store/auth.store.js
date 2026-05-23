import { create } from 'zustand';

const AUTH_SNAPSHOT_STORAGE_KEY = 'openflux.auth.snapshot';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readAuthSnapshot() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const rawSnapshot = window.localStorage.getItem(AUTH_SNAPSHOT_STORAGE_KEY);
    if (!rawSnapshot) {
      return null;
    }

    const parsedSnapshot = JSON.parse(rawSnapshot);
    if (parsedSnapshot?.status !== 'authenticated' || !parsedSnapshot.user) {
      return null;
    }

    return {
      status: 'authenticated',
      hasAdmin: parsedSnapshot.hasAdmin ?? true,
      user: parsedSnapshot.user
    };
  } catch {
    return null;
  }
}

function writeAuthSnapshot(state) {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (state?.status === 'authenticated' && state.user) {
      window.localStorage.setItem(AUTH_SNAPSHOT_STORAGE_KEY, JSON.stringify({
        status: 'authenticated',
        hasAdmin: state.hasAdmin ?? true,
        user: state.user
      }));
      return;
    }

    window.localStorage.removeItem(AUTH_SNAPSHOT_STORAGE_KEY);
  } catch {
    // Ignore storage write failures. They should not block auth flow.
  }
}

function getDefaultState() {
  const snapshot = readAuthSnapshot();

  if (snapshot) {
    return snapshot;
  }

  return {
    status: 'loading',
    hasAdmin: true,
    user: null
  };
}

export const useAuthStore = create((set) => ({
  ...getDefaultState(),
  setSessionStatus: (sessionStatus = {}) =>
    set(() => {
      const nextState = {
        status: sessionStatus.authenticated ? 'authenticated' : 'unauthenticated',
        hasAdmin: sessionStatus.hasAdmin ?? true,
        user: sessionStatus.user || null
      };
      writeAuthSnapshot(nextState);
      return nextState;
    }),
  setLoading: () => set((state) => {
    if (state.status === 'authenticated' && state.user) {
      return state;
    }

    return {
      ...state,
      status: 'loading'
    };
  }),
  updateUser: (user) => set((state) => {
    const nextState = {
      ...state,
      user: user ? { ...state.user, ...user } : state.user
    };
    writeAuthSnapshot(nextState);
    return nextState;
  }),
  clearSession: () => set((state) => {
    const nextState = {
      ...state,
      status: 'unauthenticated',
      user: null
    };
    writeAuthSnapshot(nextState);
    return nextState;
  }),
  reset: () => set(() => {
    const nextState = getDefaultState();
    writeAuthSnapshot(nextState);
    return nextState;
  })
}));
