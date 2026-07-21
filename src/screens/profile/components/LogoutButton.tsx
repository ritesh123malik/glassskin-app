import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  onLogout: () => void;
};

export const LogoutButton = ({ onLogout }: Props) => {
  return (
    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
      <LogOut size={18} color="#EF4444" />
      <Text style={styles.logoutText}>Log Out</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    height: 48,
    marginTop: 20,
    marginBottom: 24,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
});
