// A real in-memory SQLite database (Node's built-in node:sqlite) behind the subset of
// the expo-sqlite SQLiteDatabase API that the app uses, so SQL is exercised for real.
import { DatabaseSync } from 'node:sqlite';

import { migrateDatabase } from '../../src/db/schema';

type Param = string | number | null;

function flatten(params: unknown[]): Param[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as Param[];
  return params as Param[];
}

export function createRawTestDb() {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    async execAsync(sql: string) {
      sqlite.exec(sql);
    },
    async runAsync(sql: string, ...params: unknown[]) {
      const result = sqlite.prepare(sql).run(...flatten(params));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      return ((sqlite.prepare(sql).get(...flatten(params)) as T | undefined) ?? null) as T | null;
    },
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return sqlite.prepare(sql).all(...flatten(params)) as T[];
    },
    async withTransactionAsync(task: () => Promise<void>) {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    close() {
      sqlite.close();
    },
  };
  return db;
}

export type TestDb = ReturnType<typeof createRawTestDb>;

/** A migrated, empty database. */
export async function createTestDb(): Promise<TestDb> {
  const db = createRawTestDb();
  await migrateDatabase(db as never);
  return db;
}
