import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marquee } from '../../../components/common/Marquee';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

export const MarqueeStrip = () => {
  return (
    <View style={styles.marqueeSection}>
      <Marquee duration={12000}>
        <Text 
          style={styles.marqueeText}
          numberOfLines={1}
          adjustsFontSizeToFit={false}
        >  •  CRUELTY FREE  •  CLINICALLY PROVEN  •  SUSTAINABLY SOURCED  •  DERMATOLOGIST TESTED</Text>
      </Marquee>
    </View>
  );
};

const styles = StyleSheet.create({
  marqueeSection: {
    marginBottom: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
    paddingVertical: 12,
    backgroundColor: tokens.colors.glass,
  },
  marqueeText: {
    ...typography.eyebrow,
    color: tokens.colors.ink,
    fontSize: 12,
    letterSpacing: 2,
  },
});
