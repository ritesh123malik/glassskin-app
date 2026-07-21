import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassInput } from '../../components/common/GlassInput';
import { GlassButton } from '../../components/common/GlassButton';
import { useAppStore } from '../../store/useAppStore';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState(false);
  const { requestPasswordReset, authLoading, authError } = useAppStore();

  const handleReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email address');
      return;
    }
    setError(undefined);

    const sent = await requestPasswordReset(email);
    if (sent) {
      setSuccess(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={tokens.colors.ink} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logoText}>GLASSSKIN</Text>
          <Text style={styles.subtitle}>Forgot Password</Text>
        </View>

        <GlassCard variant="float-card" style={styles.card}>
          {success ? (
            <View style={styles.successWrapper}>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.successText}>
                We have sent a password reset link to <Text style={styles.boldEmail}>{email}</Text>. 
                Please click the link in your email to choose a new password.
              </Text>
              <GlassButton
                title="Go to Login"
                onPress={() => navigation.navigate('Login')}
                variant="primary"
                style={styles.actionBtn}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.cardSubtitle}>
                Enter the email address associated with your account and we will send you a password recovery link.
              </Text>

              {authError ? <Text style={styles.authError}>{authError}</Text> : null}

              <GlassInput
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(undefined);
                }}
                error={error}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Mail size={18} color={tokens.colors.muted} />}
              />

              <GlassButton
                title="Send Recovery Link"
                onPress={handleReset}
                loading={authLoading}
                variant="primary"
                style={styles.actionBtn}
              />
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    ...typography.wordmark,
    color: tokens.colors.ink,
    fontSize: 32,
    letterSpacing: 4,
  },
  subtitle: {
    ...typography.eyebrow,
    color: tokens.colors.accent,
    marginTop: 4,
  },
  card: {
    padding: 24,
  },
  title: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 24,
  },
  actionBtn: {
    width: '100%',
    marginTop: 10,
  },
  authError: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  successWrapper: {
    alignItems: 'center',
  },
  successText: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 16,
  },
  boldEmail: {
    color: tokens.colors.ink,
    fontWeight: 'bold',
  },
});
