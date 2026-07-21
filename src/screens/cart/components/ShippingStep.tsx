import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { ShippingAddress } from '../../../types';
import { supabaseClient } from '../../../services/supabaseClient';

type Props = {
  shippingAddress: ShippingAddress;
  guestEmail: string;
  onShippingChange: (address: ShippingAddress) => void;
  onEmailChange: (email: string) => void;
  isGuest: boolean;
};

export const ShippingStep = ({ shippingAddress, guestEmail, onShippingChange, onEmailChange, isGuest }: Props) => {
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [showPredictions, setShowPredictions] = React.useState(false);
  const [autocompleteUnavailable, setAutocompleteUnavailable] = React.useState(false);

  const handleAddressChange = async (text: string) => {
    onShippingChange({ ...shippingAddress, addressLine1: text });
    if (text.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient.functions.invoke('google-places-autocomplete', {
        body: { input: text }
      });

      if (error) {
        console.error('Google Autocomplete Edge Function Error:', error);
        setPredictions([]);
        setShowPredictions(false);
        setAutocompleteUnavailable(true);
        return;
      }

      if (data && data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(true);
        setAutocompleteUnavailable(false);
      }
    } catch (err) {
      console.error('Google Autocomplete Error:', err);
      setPredictions([]);
      setShowPredictions(false);
      setAutocompleteUnavailable(true);
    }
  };

  const handleSelectPrediction = async (item: any) => {
    try {
      const { data, error } = await supabaseClient.functions.invoke('google-places-autocomplete', {
        body: { action: 'details', placeId: item.place_id }
      });

      if (error || !data?.result?.address_components) {
        throw new Error('Failed to fetch address details');
      }

      const components = data.result.address_components;

      const getComponent = (types: string[]) => {
        const component = components.find((c: any) =>
          types.some((t: string) => c.types.includes(t))
        );
        return component?.long_name || component?.short_name || '';
      };

      const streetNumber = getComponent(['street_number']);
      const route = getComponent(['route']);
      const subpremise = getComponent(['subpremise']);
      const city = getComponent(['locality']);
      const state = getComponent(['administrative_area_level_1']);
      const postalCode = getComponent(['postal_code']);
      const country = getComponent(['country']);

      onShippingChange({
        fullName: shippingAddress.fullName,
        addressLine1: [streetNumber, route].filter(Boolean).join(' '),
        addressLine2: subpremise || undefined,
        city,
        state,
        postalCode,
        country: country || 'United States',
      });
    } catch (err) {
      console.error('Failed to fetch place details:', err);
      if (item.terms) {
        onShippingChange({
          fullName: shippingAddress.fullName,
          addressLine1: item.terms[0]?.value || item.terms[0] || '',
          city: item.terms[1]?.value || item.terms[1] || '',
          state: item.terms[2]?.value || item.terms[2] || '',
          postalCode: item.terms[3]?.value || item.terms[3] || '',
          country: 'United States',
        });
      }
    } finally {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  return (
    <View>
      <GlassCard variant="float-card" style={styles.formCard}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        
        {isGuest && (
          <TextInput
            testID="checkout-email-input"
            placeholder="Email Address (for order updates)"
            placeholderTextColor="rgba(248, 250, 252, 0.4)"
            style={styles.input}
            value={guestEmail}
            onChangeText={onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}

        <TextInput
          testID="checkout-name-input"
          placeholder="Full Name"
          placeholderTextColor="rgba(248, 250, 252, 0.4)"
          style={styles.input}
          value={shippingAddress.fullName}
          onChangeText={(text) => onShippingChange({ ...shippingAddress, fullName: text })}
        />

        <TextInput
          testID="checkout-address-input"
          placeholder="Address Line 1"
          placeholderTextColor="rgba(248, 250, 252, 0.4)"
          style={styles.input}
          value={shippingAddress.addressLine1}
          onChangeText={handleAddressChange}
        />
        
        {autocompleteUnavailable && (
          <Text style={{ color: '#FCD34D', fontSize: 12, marginTop: -10, marginBottom: 15, marginLeft: 5 }}>
            Autocomplete unavailable. Please enter address manually.
          </Text>
        )}

        {/* Suggestions dropdown */}
        {showPredictions && predictions.length > 0 && (
          <View style={styles.autocompleteContainer}>
            {predictions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.autocompleteItem}
                onPress={() => handleSelectPrediction(item)}
              >
                <Text style={styles.autocompleteText}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          testID="checkout-city-input"
          placeholder="City"
          placeholderTextColor="rgba(248, 250, 252, 0.4)"
          style={styles.input}
          value={shippingAddress.city}
          onChangeText={(text) => onShippingChange({ ...shippingAddress, city: text })}
        />

        <TextInput
          testID="checkout-state-input"
          placeholder="State (e.g. CA, NY, TX)"
          placeholderTextColor="rgba(248, 250, 252, 0.4)"
          style={styles.input}
          value={shippingAddress.state}
          onChangeText={(text) => onShippingChange({ ...shippingAddress, state: text })}
          autoCapitalize="characters"
        />

        <TextInput
          testID="checkout-postal-input"
          placeholder="Postal Code"
          placeholderTextColor="rgba(248, 250, 252, 0.4)"
          style={styles.input}
          value={shippingAddress.postalCode}
          onChangeText={(text) => onShippingChange({ ...shippingAddress, postalCode: text })}
          keyboardType="numeric"
        />
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  formCard: {
    padding: 20,
    borderRadius: 20,
  },
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  input: {
    height: 48,
    backgroundColor: tokens.colors.glass,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  autocompleteContainer: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    maxHeight: 180,
    zIndex: 10,
  },
  autocompleteItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  autocompleteText: {
    color: tokens.colors.ink,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
