describe('GLASSSKIN E2E Checkout Flows', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should complete full guest checkout with test payment', async () => {
    // 1. Splash / Onboarding screen
    await expect(element(by.text('Clean Beauty, Reimagined'))).toBeVisible();
    await element(by.text('Next')).tap();
    await element(by.text('Next')).tap();
    await element(by.text('Get Started')).tap();

    // 2. We should land on HomeScreen. Tap on first product
    await expect(element(by.text('Super Hydrator'))).toBeVisible();
    await element(by.text('Super Hydrator')).tap();

    // 3. ProductDetailScreen. Add to cart.
    await expect(element(by.text('Product Details'))).toBeVisible();
    await element(by.text('Add to Cart')).tap();
    
    // Tap OK on the "Added to Cart" Alert
    await element(by.text('OK')).tap();

    // Navigate to Cart Tab
    await element(by.text('Cart')).tap();

    // 4. CartScreen. Verify items.
    await expect(element(by.text('Shopping Cart'))).toBeVisible();
    await expect(element(by.text('Super Hydrator'))).toBeVisible();
    await element(by.text('Proceed to Checkout')).tap();

    // 5. CheckoutScreen (Guest checkout). Fill out form.
    await expect(element(by.text('Shipping Details'))).toBeVisible();
    
    // Enter guest email
    await element(by.id('checkout-email-input')).typeText('guest@example.com');
    
    // Enter shipping details
    await element(by.id('checkout-name-input')).typeText('Guest User');
    await element(by.id('checkout-address-input')).typeText('123 Beauty Lane');
    await element(by.id('checkout-city-input')).typeText('Los Angeles');
    await element(by.id('checkout-postal-input')).typeText('90001');
    await element(by.id('checkout-state-input')).typeText('CA');
    
    // Proceed to payment step
    await element(by.text('Continue to Payment')).tap();

    // Enter test card details
    await element(by.id('checkout-card-number')).typeText('4242 4242 4242 4242');
    await element(by.id('checkout-card-expiry')).typeText('12/28');
    await element(by.id('checkout-card-cvv')).typeText('123');

    await element(by.text('Review Order')).tap();

    // Place Order and confirm payment
    await element(by.text('Place Order')).tap();

    // 6. Confirmation screen
    await expect(element(by.text('Order Placed Successfully!'))).toBeVisible();
    await element(by.text('Continue Shopping')).tap();
  });

  it('should complete authenticated purchase and track order status', async () => {
    // 1. Navigate to Profile tab and sign in
    await element(by.text('Profile')).tap();
    await expect(element(by.text('Create a Profile'))).toBeVisible();
    await element(by.text('Log In / Sign Up')).tap();

    // Login Form
    await element(by.id('login-email-input')).typeText('customer@example.com');
    await element(by.id('login-password-input')).typeText('password123');
    await element(by.text('Sign In')).tap();

    // 2. Select product & checkout
    await element(by.text('Home')).tap();
    await element(by.text('Super Hydrator')).tap();
    await element(by.text('Add to Cart')).tap();
    await element(by.text('OK')).tap();

    await element(by.text('Cart')).tap();
    await element(by.text('Proceed to Checkout')).tap();

    // 3. Verify pre-filled address and continue
    await element(by.text('Continue to Payment')).tap();
    await element(by.text('Review Order')).tap();
    await element(by.text('Place Order')).tap();

    // 4. Navigate to order history in Profile
    await element(by.text('Profile')).tap();
    await element(by.text('Order History (1)')).tap();
    
    // Tap the placed order to view tracking status
    await element(by.text('Tap to track order →')).tap();
    await expect(element(by.text('Order Placed'))).toBeVisible();
  });
});
