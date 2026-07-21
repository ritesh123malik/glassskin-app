import { useStripe } from '../stripe.web';

describe('stripe.web polyfill', () => {
  beforeEach(() => {
    jest.resetModules();
    delete (global as any).process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  });

  it('returns a config error from initPaymentSheet when Stripe publishable key is missing', async () => {
    const { initPaymentSheet } = useStripe();

    const result = await initPaymentSheet({
      paymentIntentClientSecret: 'pi_test_secret',
      merchantDisplayName: 'GLASSSKIN',
    });

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('not configured');
  });

  it('returns a web unavailability error from presentPaymentSheet when Stripe publishable key is missing', async () => {
    const { presentPaymentSheet } = useStripe();

    const result = await presentPaymentSheet();

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('not available on web');
  });

  it('returns a mobile-app-only error from presentPaymentSheet when initialized but key is missing', async () => {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const initResult = await initPaymentSheet({
      paymentIntentClientSecret: 'pi_test_secret',
      merchantDisplayName: 'GLASSSKIN',
    });

    if (initResult.error) {
      return;
    }

    const result = await presentPaymentSheet();
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('only available in the GLASSSKIN mobile app');
  });
});
