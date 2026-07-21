import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  onBack: () => void;
  onToggleWishlist: () => void;
  wishlisted: boolean;
  title: string;
};

export const ProductHeader = ({ onBack, onToggleWishlist, wishlisted, title }: Props) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to the previous screen"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.headerBtnText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={onToggleWishlist}
        accessibilityRole="button"
        accessibilityLabel={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        accessibilityHint="Toggles this product in your wishlist"
        testID="wishlist-btn"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Heart
          size={20}
          color={wishlisted ? '#EF4444' : '#0B0B0C'}
          fill={wishlisted ? '#EF4444' : 'transparent'}
        />
      </TouchableOpacity>
    </View>
  );
};

import { Heart } from 'lucide-react-native';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink, fontSize: 16,
    flex: 1, textAlign: 'center', paddingHorizontal: 12,
  },
  headerBtn: { paddingVertical: 4 },
  headerBtnText: { color: tokens.colors.accent, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
