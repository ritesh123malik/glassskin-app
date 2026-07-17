import React from 'react';

// Polyfill StripeProvider for web to prevent native module crashes
export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Polyfill useStripe for web
export const useStripe = () => {
  return {
    initPaymentSheet: async () => {
      console.warn('Stripe is not supported on the web version of this app.');
      return { error: { message: 'Stripe payments are only available in the native mobile app.' } };
    },
    presentPaymentSheet: async () => {
      return { error: { message: 'Stripe payments are only available in the native mobile app.' } };
    },
  };
};
