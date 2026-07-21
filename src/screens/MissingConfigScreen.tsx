import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';

export const MissingConfigScreen = () => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard intensity="high" style={styles.card}>
          <Text style={styles.title}>Configuration Required</Text>
          <Text style={styles.subtitle}>
            GLASSSKIN cannot start because required environment variables are missing.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>For Mobile (Expo)</Text>
            <Text style={styles.step}>
              1. Copy <Text style={styles.code}>.env.example</Text> to <Text style={styles.code}>.env</Text>
            </Text>
            <Text style={styles.step}>
              2. Set <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL</Text> to your Supabase project URL
            </Text>
            <Text style={styles.step}>
              3. Set <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> to your Supabase anon key
            </Text>
            <Text style={styles.step}>
              4. Restart the Expo dev server
            </Text>
          </View>

          {Platform.OS === 'web' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>For Web</Text>
              <Text style={styles.step}>
                Also ensure your hosting platform injects these variables at build/run time.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>For Admin Dashboard (Next.js)</Text>
            <Text style={styles.step}>
              1. Copy <Text style={styles.code}>admin/.env.example</Text> to <Text style={styles.code}>admin/.env.local</Text>
            </Text>
            <Text style={styles.step}>
              2. Set <Text style={styles.code}>NEXT_PUBLIC_SUPABASE_URL</Text> and <Text style={styles.code}>NEXT_PUBLIC_SUPABASE_ANON_KEY</Text>
            </Text>
            <Text style={styles.step}>
              3. Restart the Next.js dev server
            </Text>
          </View>

          <Text style={styles.note}>
            Check the console for the exact missing variables.
          </Text>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    width: '100%',
    maxWidth: 600,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  title: {
    color: '#0B0B0C',
    fontSize: 22,
    fontFamily: 'Raleway_700Bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#6B6660',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
    width: '100%',
  },
  sectionTitle: {
    color: '#0B0B0C',
    fontSize: 16,
    fontFamily: 'Raleway_600SemiBold',
    marginBottom: 8,
  },
  step: {
    color: '#6B6660',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 4,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#8E5D34',
    backgroundColor: '#EDE8E3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  note: {
    color: '#6B6660',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
