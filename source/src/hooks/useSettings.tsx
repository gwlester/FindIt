import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../db/settings';

type SettingsContextValue = {
  settings: Settings;
  loaded: boolean;
  updateSettings: (next: Settings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings(db)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [db]);

  const updateSettings = useCallback(
    async (next: Settings) => {
      await saveSettings(db, next);
      setSettings(next);
    },
    [db],
  );

  return <SettingsContext value={{ settings, loaded, updateSettings }}>{children}</SettingsContext>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
