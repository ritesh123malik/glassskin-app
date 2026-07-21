import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassInput } from '../../components/common/GlassInput';
import { GlassButton } from '../../components/common/GlassButton';
import { useAppStore } from '../../store/useAppStore';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, signInWithSocial, signInAsGuest, authLoading, authError } = useAppStore();

  const validate = () => {
    const tempErrors: { email?: string; password?: string } = {};
    if (!email) {
      tempErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email address';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleLogin = async () => {
    if (validate()) {
      const success = await signIn(email, password);
      if (success) {
        navigation.navigate('MainTabs');
      }
    }
  };

  const handleGuestCheckout = async () => {
    // Create an anonymous Supabase auth session so the guest has a real
    // auth.uid(). This prevents user_id from being NULL on guest orders
    // and ensures standard RLS (auth.uid() = user_id) scopes all data.
    const success = await signInAsGuest();
    if (success) {
      navigation.navigate('MainTabs');
    } else {
      Alert.alert(
        'Guest Checkout Unavailable',
        'Unable to start a guest session. Please sign in or try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    const success = await signInWithSocial(provider);
    if (success) {
      navigation.navigate('MainTabs');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logoText}>GLASSSKIN</Text>
          <Text style={styles.subtitle}>Natural Toxin-Free Skincare</Text>
        </View>

        <GlassCard variant="float-card" style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account to continue</Text>

          {authError ? <Text style={styles.authError}>{authError}</Text> : null}

          <GlassInput
            testID="login-email-input"
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail size={18} color={tokens.colors.muted} />}
          />

          <GlassInput
            testID="login-password-input"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
            icon={<Lock size={18} color={tokens.colors.muted} />}
          />

          <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <GlassButton
            title="Log In"
            onPress={handleLogin}
            loading={authLoading}
            variant="primary"
            style={styles.loginBtn}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Logins */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={styles.socialButton} 
              activeOpacity={0.7}
              onPress={() => handleSocialLogin('google')}
            >
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton} 
              activeOpacity={0.7}
              onPress={() => handleSocialLogin('apple')}
            >
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Guest Checkout Option */}
          <TouchableOpacity
            style={styles.guestLink}
            onPress={handleGuestCheckout}
            activeOpacity={0.7}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator size="small" color="#a78bfa" />
            ) : (
              <Text style={styles.guestLinkText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
    marginTop: 8,
  },
  card: {
    padding: 24,
  },
  title: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 22,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  loginBtn: {
    width: '100%',
    marginBottom: 16,
  },
  authError: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.line,
  },
  dividerText: {
    color: tokens.colors.muted,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  socialButton: {
    flex: 0.48,
    height: 44,
    borderRadius: 10,
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  guestLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  guestLinkText: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  signupText: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  signupLink: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: 'bold',
  },
});
