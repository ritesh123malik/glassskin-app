import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

// Loud startup check for missing environment variables
if (!useMocks) {
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error(
      'CRITICAL: EXPO_PUBLIC_SUPABASE_URL environment variable is missing or empty. ' +
      'Please configure it in your .env file or build environment.'
    );
  }
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    throw new Error(
      'CRITICAL: EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is missing or empty. ' +
      'Please configure it in your .env file or build environment.'
    );
  }
}

// Chunked SecureStore Adapter to overcome the 2048-byte limit on Android
const CHUNK_SIZE = 2000;

export const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
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
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.setItem(key, value);
    }
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
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.removeItem(key);
    }
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
  },
};

export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      storage: SecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
