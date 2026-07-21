import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { User as AppUser } from '../../../types';

type Props = {
  user: AppUser;
};

export const ProfileHeader = ({ user }: Props) => {
  return (
    <GlassCard variant="float-card" style={styles.profileHeaderCard}>
      <View style={styles.avatarWrapper}>
        <User size={36} color={tokens.colors.accent} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user?.full_name || 'Guest User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'guest@glassskin.com'}</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
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
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
  },
  userEmail: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
