import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Mail, Lock, User, CheckSquare, Square } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassInput } from '../../components/common/GlassInput';
import { GlassButton } from '../../components/common/GlassButton';
import { useAppStore } from '../../store/useAppStore';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

export const SignupScreen = ({ route, navigation }: any) => {
  const { email: initialEmail = '', fullName: initialFullName = '' } = route.params || {};

  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; confirmPassword?: string; agreedToTerms?: string }>({});

  const { signUp, authLoading, authError } = useAppStore();

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialFullName) setFullName(initialFullName);
  }, [initialEmail, initialFullName]);

  const validate = () => {
    const tempErrors: { fullName?: string; email?: string; password?: string; confirmPassword?: string; agreedToTerms?: string } = {};
    if (!fullName) {
      tempErrors.fullName = 'Full Name is required';
    }
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
    if (!confirmPassword) {
      tempErrors.confirmPassword = 'Confirm Password is required';
    } else if (confirmPassword !== password) {
      tempErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedToTerms) {
      tempErrors.agreedToTerms = 'You must agree to the Terms of Service and Privacy Policy';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSignup = async () => {
    if (validate()) {
      const success = await signUp(email, password, fullName);
      if (success) {
        navigation.navigate('MainTabs');
      }
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Sign up to start your clean beauty journey</Text>

          {authError ? <Text style={styles.authError}>{authError}</Text> : null}

          <GlassInput
            label="Full Name"
            placeholder="Enter your name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) setErrors({ ...errors, fullName: undefined });
            }}
            error={errors.fullName}
            icon={<User size={18} color={tokens.colors.muted} />}
          />

          <GlassInput
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
            label="Password"
            placeholder="Create a password"
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

          <GlassInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            error={errors.confirmPassword}
            secureTextEntry
            autoCapitalize="none"
            icon={<Lock size={18} color={tokens.colors.muted} />}
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => {
                setAgreedToTerms(!agreedToTerms);
                if (errors.agreedToTerms) setErrors({ ...errors, agreedToTerms: undefined });
              }}
              activeOpacity={0.7}
            >
              {agreedToTerms ? (
                <CheckSquare size={20} color={tokens.colors.accent} />
              ) : (
                <Square size={20} color={tokens.colors.muted} />
              )}
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.agreedToTerms ? <Text style={styles.termsError}>{errors.agreedToTerms}</Text> : null}
          </View>

          <GlassButton
            title="Sign Up"
            onPress={handleSignup}
            loading={authLoading}
            variant="primary"
            style={styles.signupBtn}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  termsContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  termsText: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 10,
    flex: 1,
  },
  termsLink: {
    color: tokens.colors.accent,
  },
  termsError: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    marginLeft: 30,
  },
  signupBtn: {
    width: '100%',
    marginTop: 10,
    marginBottom: 16,
  },
  authError: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  loginLink: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: 'bold',
  },
});
