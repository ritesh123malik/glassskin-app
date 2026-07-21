import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

export const isSupabaseConfigured = useMocks || (!!supabaseUrl && supabaseUrl.trim() !== '' && !!supabaseAnonKey && supabaseAnonKey.trim() !== '');

if (!isSupabaseConfigured) {
  const message =
    '[supabaseClient] Missing required environment variables: ' +
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set. ' +
    'Copy .env.example to .env and fill in your Supabase project credentials.';

  console.error(message);

  if (__DEV__) {
    throw new Error(message);
  }
}

// Chunked SecureStore Adapter to overcome the 2048-byte limit on Android
const CHUNK_SIZE = 2000;

// Per-key async lock queue to serialize all reads/writes/deletes for the same key.
// Prevents race conditions such as:
//   - getItem reading chunks while removeItem is deleting them
//   - interleaved chunk writes during concurrent token refreshes
const keyLocks = new Map<string, Promise<void>>();

async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = keyLocks.get(key) || Promise.resolve();

  let next: Promise<void>;
  next = previous.catch(() => {}).then(() => fn() as unknown as Promise<void>).finally(() => {
    if (keyLocks.get(key) === next) {
      keyLocks.delete(key);
    }
  });

  keyLocks.set(key, next);
  return next as unknown as Promise<T>;
}

export const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    return withKeyLock(key, async () => {
      try {
        const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
        if (!chunkCountStr) {
          return await SecureStore.getItemAsync(key);
        }
        const count = parseInt(chunkCountStr, 10);
        let value = '';
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (!chunk) return null;
          value += chunk;
        }
        return value;
      } catch (err) {
        console.error('SecureStoreAdapter.getItem error:', err);
        return null;
      }
    });
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.setItem(key, value);
    }
    return withKeyLock(key, async () => {
      try {
        if (value.length < CHUNK_SIZE) {
          await SecureStore.setItemAsync(key, value);
        } else {
          const chunks = Math.ceil(value.length / CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_chunks`, chunks.toString());
          for (let i = 0; i < chunks; i++) {
            const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
          }
        }
      } catch (err) {
        console.error('SecureStoreAdapter.setItem error:', err);
      }
    });
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.removeItem(key);
    }
    return withKeyLock(key, async () => {
      try {
        await SecureStore.deleteItemAsync(key);
        const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
        if (chunkCountStr) {
          await SecureStore.deleteItemAsync(`${key}_chunks`);
          const count = parseInt(chunkCountStr, 10);
          for (let i = 0; i < count; i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
        }
      } catch (err) {
        console.error('SecureStoreAdapter.removeItem error:', err);
      }
    });
  },
};

export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: SecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

