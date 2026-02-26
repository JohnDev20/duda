import { create } from 'zustand';

interface SettingsStore {
  theme: 'dark' | 'light';
  readerMode: 'horizontal' | 'vertical';
  developerMode: boolean;
  versionTapCount: number;
  
  setTheme: (theme: 'dark' | 'light') => void;
  setReaderMode: (mode: 'horizontal' | 'vertical') => void;
  toggleDeveloperMode: () => void;
  incrementVersionTap: () => void;
  resetVersionTap: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: 'dark',
  readerMode: 'horizontal',
  developerMode: false,
  versionTapCount: 0,
  
  setTheme: (theme) => set({ theme }),
  setReaderMode: (mode) => set({ readerMode: mode }),
  toggleDeveloperMode: () => set((state) => ({ 
    developerMode: !state.developerMode 
  })),
  incrementVersionTap: () => set((state) => {
    const newCount = state.versionTapCount + 1;
    if (newCount >= 5) {
      return { versionTapCount: 0, developerMode: true };
    }
    return { versionTapCount: newCount };
  }),
  resetVersionTap: () => set({ versionTapCount: 0 }),
}));
