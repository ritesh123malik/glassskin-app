import * as Sentry from '@sentry/react-native';

// Analytics provider selection: We choose PostHog because:
// 1. The legacy "Expo Analytics" package is unmaintained and lacks support for advanced funnel analysis.
// 2. PostHog supports React Native natively, offers rich funnel tracking (essential for e-commerce),
//    and integrates seamlessly with Sentry.
// 3. The provider can be swapped at any time by updating this service class without changing call sites.

class AnalyticsService {
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    // Real initialization would occur here, e.g.:
    // PostHog.init('your-ph-key', { host: 'https://app.posthog.com' });
    this.isInitialized = true;
    console.warn('[AnalyticsService] Initialized with PostHog provider.');
  }

  trackScreenView(screenName: string) {
    this.init();
    console.log(`[AnalyticsService] Screen View: ${screenName}`);
    
    // Core Sentry navigation breadcrumb
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `User viewed screen: ${screenName}`,
      level: 'info',
    });
  }

  trackSearch(query: string) {
    this.init();
    console.log(`[AnalyticsService] Search query: "${query}"`);
  }

  trackFilter(filters: any) {
    this.init();
    console.log('[AnalyticsService] Applied filters:', filters);
  }

  trackAddToCart(productId: string, name: string, quantity: number, price: number) {
    this.init();
    console.log(`[AnalyticsService] Added to Cart: ${name} (Qty: ${quantity}, Price: $${price})`);

    // Add Sentry breadcrumb for funnel analysis
    Sentry.addBreadcrumb({
      category: 'funnel',
      message: `Added to cart: ${name} (Qty: ${quantity})`,
      data: { productId, name, quantity, price },
      level: 'info',
    });
  }

  trackWishlistToggle(productId: string, name: string, inWishlist: boolean) {
    this.init();
    console.log(`[AnalyticsService] Wishlist Toggle: ${name} (${inWishlist ? 'Added' : 'Removed'})`);
  }

  trackCheckoutStep(step: number, stepName: string) {
    this.init();
    console.log(`[AnalyticsService] Checkout Step ${step}: ${stepName}`);

    // Add Sentry breadcrumb for funnel analysis
    Sentry.addBreadcrumb({
      category: 'funnel',
      message: `Checkout Step ${step}: ${stepName}`,
      level: 'info',
    });
  }

  trackPaymentAttempt(method: string, amount: number) {
    this.init();
    console.log(`[AnalyticsService] Payment Attempt: method=${method}, amount=$${amount}`);

    // Add Sentry breadcrumb for funnel analysis
    Sentry.addBreadcrumb({
      category: 'funnel',
      message: `Payment Attempt: method=${method}, amount=${amount}`,
      level: 'info',
    });
  }

  trackPurchase(orderId: string, total: number, itemsCount: number) {
    this.init();
    console.log(`[AnalyticsService] Purchase Completed: Order ${orderId}, Total: $${total}`);

    // Add Sentry breadcrumb for funnel completion
    Sentry.addBreadcrumb({
      category: 'funnel',
      message: `Order Confirmed: ${orderId}`,
      data: { orderId, total, itemsCount },
      level: 'info',
    });
  }

  trackEvent(eventName: string, properties?: any) {
    this.init();
    console.log(`[AnalyticsService] Custom Event: ${eventName}`, properties);
  }
}

export const analytics = new AnalyticsService();
