import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { ActivityIndicator } from 'react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  visible: boolean;
  paypalUrl: string | null;
  onClose: () => void;
  onNavigationStateChange: (navState: any) => void;
};

export const PayPalModal = ({ visible, paypalUrl, onClose, onNavigationStateChange }: Props) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F2EE' }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>PayPal Checkout</Text>
          <View style={{ width: 50 }} />
        </View>
        {paypalUrl && (
          <WebView
            source={{ uri: paypalUrl }}
            onNavigationStateChange={onNavigationStateChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoader}>
                <ActivityIndicator size="large" color="#8E5D34" />
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#EF4444',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  modalTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  webviewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
  },
});
