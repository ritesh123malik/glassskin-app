import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  onLoginPress: () => void;
};

export const GuestView = ({ onLoginPress }: Props) => {
  return (
    <View style={styles.guestContainer}>
      <GlassCard variant="float-card" style={styles.guestCard}>
        <View style={styles.avatarWrapper}>
          <User size={36} color={tokens.colors.muted} />
        </View>
        <Text style={styles.guestTitle}>Create a Profile</Text>
        <Text style={styles.guestSubtitle}>
          Sign in or create an account to view your order history, manage shipping addresses, and save default payment methods.
        </Text>
        <TouchableOpacity 
          style={styles.guestBtn}
          onPress={onLoginPress}
        >
          <Text style={styles.guestBtnText}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: tokens.colors.background,
  },
  guestCard: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  guestSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  guestBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: 12,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBtnText: {
    color: tokens.colors.background,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    fontWeight: 'bold',
  },
});
