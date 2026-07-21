import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Download, UserX, LayoutTemplate } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { supabase } from '../../../services/supabaseClient';

type Props = {
  onExportData: () => void;
  onDeleteAccount: () => void;
  onComponentGalleryPress?: () => void;
  showDevOption?: boolean;
};

export const DataPrivacy = ({
  onExportData,
  onDeleteAccount,
  onComponentGalleryPress,
  showDevOption = false,
}: Props) => {
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete-user-data');
              if (error) throw error;
              Alert.alert('Account Deleted', 'Your account and personal data have been deleted.');
              onDeleteAccount();
            } catch (err: any) {
              Alert.alert('Deletion Failed', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Data & Privacy</Text>
      <GlassCard variant="float-card" style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={onExportData}>
          <View style={styles.menuItemLeft}>
            <Download size={18} color={tokens.colors.accent} />
            <Text style={styles.menuItemText}>Export My Data</Text>
          </View>
          <ChevronRight size={16} color={tokens.colors.muted} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, !__DEV__ && { borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
          <View style={styles.menuItemLeft}>
            <UserX size={18} color="#EF4444" />
            <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete Account</Text>
          </View>
          <ChevronRight size={16} color={tokens.colors.muted} />
        </TouchableOpacity>
        
        {showDevOption && (
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={onComponentGalleryPress}>
            <View style={styles.menuItemLeft}>
              <LayoutTemplate size={18} color={tokens.colors.accent} />
              <Text style={styles.menuItemText}>Component Gallery (Dev)</Text>
            </View>
            <ChevronRight size={16} color={tokens.colors.muted} />
          </TouchableOpacity>
        )}
      </GlassCard>
    </View>
  );
};

import { ChevronRight } from 'lucide-react-native';

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 12,
    marginTop: 10,
  },
  menuCard: {
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: tokens.colors.line,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: tokens.colors.ink,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginLeft: 12,
  },
});
