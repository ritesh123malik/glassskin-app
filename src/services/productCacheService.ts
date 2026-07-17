import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Product } from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === 'web') return null;
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('products_cache.db');
    // Initialize schema
    dbInstance.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS cached_products (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      );
    `);
  }
  return dbInstance;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const productCacheService = {
  /**
   * Saves products to the local SQLite database cache.
   */
  saveProducts(products: Product[]): void {
    const db = getDb();
    if (!db) return;
    const now = Date.now();

    // Use transaction to insert/replace all items efficiently
    try {
      db.execSync('BEGIN TRANSACTION;');
      // Clear existing cache first
      db.runSync('DELETE FROM cached_products;');
      
      const statement = db.prepareSync(
        'INSERT OR REPLACE INTO cached_products (id, data, cached_at) VALUES (?, ?, ?);'
      );
      
      for (const product of products) {
        statement.executeSync([product.id, JSON.stringify(product), now]);
      }
      
      statement.finalizeSync();
      db.execSync('COMMIT;');
    } catch (error) {
      try {
        db.execSync('ROLLBACK;');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      console.error('Failed to save products to local SQLite cache:', error);
    }
  },

  /**
   * Retrieves products from local cache. Returns null if empty.
   */
  getCachedProducts(): Product[] | null {
    const db = getDb();
    if (!db) return null;
    try {
      const rows = db.getAllSync<{ data: string }>('SELECT data FROM cached_products;');
      if (!rows || rows.length === 0) {
        return null;
      }
      return rows.map(row => JSON.parse(row.data) as Product);
    } catch (error) {
      console.error('Failed to read products from local SQLite cache:', error);
      return null;
    }
  },

  /**
   * Checks if the cache has expired (older than 7 days) or is empty.
   */
  isCacheStale(): boolean {
    try {
      const db = getDb();
      if (!db) return true;
      const row = db.getFirstSync<{ cached_at: number }>(
        'SELECT cached_at FROM cached_products LIMIT 1;'
      );
      if (!row) {
        return true; // No cache exists
      }
      return Date.now() - row.cached_at > CACHE_TTL_MS;
    } catch (error) {
      console.error('Failed to check if local SQLite cache is stale:', error);
      return true;
    }
  },

  /**
   * Clear the local cache entirely.
   */
  clearCache(): void {
    try {
      const db = getDb();
      if (!db) return;
      db.runSync('DELETE FROM cached_products;');
    } catch (error) {
      console.error('Failed to clear local SQLite cache:', error);
    }
  }
};
