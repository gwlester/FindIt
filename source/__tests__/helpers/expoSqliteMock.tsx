// expo-sqlite mock: SQLiteProvider runs onInit on the current test database and then
// renders its children; useSQLiteContext returns that database.
import { useEffect, useState, type ReactNode } from 'react';

import type { TestDb } from './testDb';

let current: TestDb | null = null;

export function setCurrentDb(db: TestDb | null) {
  current = db;
}

function currentDb() {
  if (!current) throw new Error('No test database: call setCurrentDb() first');
  return current;
}

export function useSQLiteContext() {
  return currentDb();
}

export function SQLiteProvider({ children, onInit }: { children: ReactNode; onInit?: (db: TestDb) => Promise<void> }) {
  const [ready, setReady] = useState(!onInit);
  useEffect(() => {
    if (onInit) onInit(currentDb()).then(() => setReady(true));
  }, [onInit]);
  return ready ? <>{children}</> : null;
}
