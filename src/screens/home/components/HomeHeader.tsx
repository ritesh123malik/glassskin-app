import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ShoppingBag, Bell } from 'lucide-react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  userName: string;
  cartItemsCount: number;
  onCartPress: () => void;
};

export const HomeHeader = ({ userName, cartItemsCount, onCartPress }: Props) => {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.welcomeText}>Hello,</Text>
        <Text style={styles.userName}>{userName || 'Guest User'}</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onCartPress}
        >
          <ShoppingBag size={20} color={tokens.colors.ink} />
          {cartItemsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartItemsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Bell size={20} color={tokens.colors.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
  },
  welcomeText: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  userName: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: 10,
    padding: 10,
    marginLeft: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: tokens.colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Raleway_700Bold',
  },
});
