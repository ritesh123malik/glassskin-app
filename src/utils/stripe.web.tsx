import React from 'react';

let stripePromise: Promise<any> | null = null;
let currentClientSecret: string | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(publishableKey)
    );
  }
  return stripePromise;
}

export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useStripe = () => {
  const initPaymentSheet = async ({
    paymentIntentClientSecret,
    merchantDisplayName,
    defaultBillingDetails,
  }: {
    paymentIntentClientSecret: string;
    merchantDisplayName?: string;
    defaultBillingDetails?: { name?: string; email?: string };
  }) => {
    try {
      const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey || publishableKey.includes('your_stripe')) {
        return {
          error: {
            message:
              'Stripe is not configured for web checkout. Please use the GLASSSKIN mobile app to complete your purchase.',
          },
        };
      }

      currentClientSecret = paymentIntentClientSecret;

      const stripe = await getStripePromise(publishableKey);

      if (!stripe) {
        return {
          error: {
            message:
              'Failed to initialize Stripe on web. Please use the GLASSSKIN mobile app to complete your purchase.',
          },
        };
      }

      return { error: undefined };
    } catch (err: any) {
      console.error('[stripe.web] initPaymentSheet error:', err);
      return {
        error: {
          message: err?.message ?? 'Failed to initialize Stripe on web.',
        },
      };
    }
  };

  const presentPaymentSheet = async () => {
    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey || publishableKey.includes('your_stripe')) {
      return {
        error: {
          message:
            'Stripe checkout is not available on web yet. Please use the GLASSSKIN mobile app to complete your purchase.',
        },
      };
    }

    if (!currentClientSecret) {
      return {
        error: {
          message:
            'Payment session is not initialized. Please go back and try again, or use the GLASSSKIN mobile app.',
        },
      };
    }

    return {
      error: {
        message:
          'Card payments are only available in the GLASSSKIN mobile app. Please download the app to complete your purchase securely.',
      },
    };
  };

  return { initPaymentSheet, presentPaymentSheet };
};
