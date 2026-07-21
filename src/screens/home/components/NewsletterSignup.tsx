import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Send } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { RevealOnScroll } from '../../../components/common/RevealOnScroll';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  emailInput: string;
  emailSubscribed: boolean;
  newsletterLoading: boolean;
  newsletterError: string | null;
  scrollY: any;
  screenHeight: number;
  onEmailChange: (email: string) => void;
  onSubscribe: () => void;
};

export const NewsletterSignup = ({
  emailInput,
  emailSubscribed,
  newsletterLoading,
  newsletterError,
  scrollY,
  screenHeight,
  onEmailChange,
  onSubscribe,
}: Props) => {
  return (
    <RevealOnScroll scrollY={scrollY} screenHeight={screenHeight}>
      <View style={{ marginHorizontal: 20 }}>
        <GlassCard variant="bento-item" style={styles.newsletterCard}>
          <Text style={styles.newsletterTitle}>Join the GLASSSKIN Club</Text>
          <Text style={styles.newsletterSubtitle}>
            Subscribe for exclusive offers, toxin-free skincare tips, and product releases.
          </Text>
          {emailSubscribed ? (
            <Text style={styles.subscribedText}>✨ Thank you for subscribing!</Text>
          ) : (
            <View style={styles.newsletterForm}>
              <View style={styles.newsletterInputRow}>
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor={tokens.colors.muted}
                  style={styles.newsletterInput}
                  value={emailInput}
                  onChangeText={onEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!newsletterLoading}
                />
                <TouchableOpacity
                  style={[styles.newsletterSendBtn, newsletterLoading && styles.newsletterSendBtnDisabled]}
                  onPress={onSubscribe}
                  disabled={newsletterLoading}
                >
                  {newsletterLoading ? (
                    <ActivityIndicator size="small" color={tokens.colors.ink} />
                  ) : (
                    <Send size={16} color={tokens.colors.ink} />
                  )}
                </TouchableOpacity>
              </View>
              {newsletterError && (
                <Text style={styles.newsletterError}>{newsletterError}</Text>
              )}
            </View>
          )}
        </GlassCard>
      </View>
    </RevealOnScroll>
  );
};

const styles = StyleSheet.create({
  newsletterCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  newsletterTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
  },
  newsletterSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  newsletterInputRow: {
    flexDirection: 'row',
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: 'hidden',
  },
  newsletterInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12,
  },
  newsletterSendBtn: {
    backgroundColor: tokens.colors.glass,
    borderLeftWidth: 1,
    borderColor: tokens.colors.line,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribedText: {
    color: tokens.colors.accent,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  newsletterForm: {
    width: '100%',
  },
  newsletterSendBtnDisabled: {
    opacity: 0.6,
  },
  newsletterError: {
    color: '#EF4444',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
