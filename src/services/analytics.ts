// import * as Sentry from '@sentry/react-native';
// import posthog from 'posthog-js';

// Analytics provider: PostHog
// Configure via environment variables:
//   POSTHOG_API_KEY=your-posthog-project-api-key
//   POSTHOG_HOST=https://app.posthog.com (or self-hosted URL)

class AnalyticsService {
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;

    const apiKey = process.env.POSTHOG_API_KEY;
    const apiHost = process.env.POSTHOG_HOST || 'https://app.posthog.com';

    if (!apiKey) {
      console.warn('[AnalyticsService] POSTHOG_API_KEY is not set. Analytics events will not be sent.');
      this.isInitialized = true;
      return;
    }

    // try {
    //   posthog.init(apiKey, {
    //     api_host: apiHost,
    //     loaded: () => {
    //       console.log('[AnalyticsService] PostHog initialized.');
    //     },
    //     // Enable debug logging in development
    //     debug: __DEV__,
    //   });
    // } catch (error) {
    //   console.error('[AnalyticsService] Failed to initialize PostHog:', error);
    // }

    this.isInitialized = true;
  }

  private capture(eventName: string, properties?: Record<string, any>) {
    // if (posthog) {
    //   posthog.capture(eventName, properties);
    // }
    if (__DEV__) {
      console.log(`[AnalyticsService] ${eventName}`, properties);
    }
  }

  trackScreenView(screenName: string) {
    this.init();
    
    this.capture('screen_view', { screen_name: screenName });

    // Core Sentry navigation breadcrumb
    // Sentry.addBreadcrumb({
    //   category: 'navigation',
    //   message: `User viewed screen: ${screenName}`,
    //   level: 'info',
    // });
  }

  trackSearch(query: string) {
    this.init();
    this.capture('search', { query });
  }

  trackFilter(filters: any) {
    this.init();
    this.capture('filters_applied', { filters });
  }

  trackAddToCart(productId: string, name: string, quantity: number, price: number) {
    this.init();
    
    this.capture('add_to_cart', {
      product_id: productId,
      product_name: name,
      quantity,
      price,
    });

    // Add Sentry breadcrumb for funnel analysis
    // Sentry.addBreadcrumb({
    //   category: 'funnel',
    //   message: `Added to cart: ${name} (Qty: ${quantity})`,
    //   data: { productId, name, quantity, price },
    //   level: 'info',
    // });
  }

  trackWishlistToggle(productId: string, name: string, inWishlist: boolean) {
    this.init();
    
    this.capture('wishlist_toggle', {
      product_id: productId,
      product_name: name,
      in_wishlist: inWishlist,
    });
  }

  trackCheckoutStep(step: number, stepName: string) {
    this.init();
    
    this.capture('checkout_step', {
      step,
      step_name: stepName,
    });

    // Add Sentry breadcrumb for funnel analysis
    // Sentry.addBreadcrumb({
    //   category: 'funnel',
    //   message: `Checkout Step ${step}: ${stepName}`,
    //   level: 'info',
    // });
  }

  trackPaymentAttempt(method: string, amount: number) {
    this.init();
    
    this.capture('payment_attempt', {
      method,
      amount,
    });

    // Add Sentry breadcrumb for funnel analysis
    // Sentry.addBreadcrumb({
    //   category: 'funnel',
    //   message: `Payment Attempt: method=${method}, amount=${amount}`,
    //   level: 'info',
    // });
  }

  trackPurchase(orderId: string, total: number, itemsCount: number) {
    this.init();
    
    this.capture('purchase_completed', {
      order_id: orderId,
      total,
      items_count: itemsCount,
    });

    // Add Sentry breadcrumb for funnel completion
    // Sentry.addBreadcrumb({
    //   category: 'funnel',
    //   message: `Order Confirmed: ${orderId}`,
    //   data: { orderId, total, itemsCount },
    //   level: 'info',
    // });
  }

  trackEvent(eventName: string, properties?: any) {
    this.init();
    this.capture(eventName, properties);
  }
}

export const analytics = new AnalyticsService();
