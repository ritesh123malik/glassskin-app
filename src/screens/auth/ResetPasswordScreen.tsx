import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Lock } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassInput } from '../../components/common/GlassInput';
import { GlassButton } from '../../components/common/GlassButton';
import { supabaseClient } from '../../services/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

export const ResetPasswordScreen = ({ navigation }: any) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const { setRecoveringPassword, signOut } = useAppStore();

  const validate = () => {
    const tempErrors: { password?: string; confirmPassword?: string } = {};
    if (!password) {
      tempErrors.password = 'New password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      tempErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your password has been successfully updated. Please log in with your new password.',
        [
          {
            text: 'OK',
            onPress: async () => {
              setRecoveringPassword(false);
              // Log the user out of the temporary reset session and redirect to Login
              await signOut();
              navigation.replace('Login');
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logoText}>GLASSSKIN</Text>
          <Text style={styles.subtitle}>Reset Password</Text>
        </View>

        <GlassCard variant="float-card" style={styles.card}>
          <Text style={styles.title}>Choose New Password</Text>
          <Text style={styles.cardSubtitle}>
            Please enter your new password below. Once saved, you will be redirected to the login screen.
          </Text>

          <GlassInput
            label="New Password"
            placeholder="Enter new password"
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
            placeholder="Re-enter new password"
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

          <GlassButton
            title="Update Password"
            onPress={handleUpdatePassword}
            loading={loading}
            variant="primary"
            style={styles.actionBtn}
          />
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
});
