describe('GLASSSKIN Native Smoke Tests', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should render the marquee and 3D model with non-zero dimensions on native', async () => {
    // 1. Complete onboarding flow to enter the Home Screen
    await expect(element(by.text('Clean Beauty, Reimagined'))).toBeVisible();
    await element(by.text('Next')).tap();
    await element(by.text('Next')).tap();
    await element(by.text('Get Started')).tap();

    // 2. Assert Marquee container visibility
    // Detox's toBeVisible() asserts that the element is on screen and has non-zero width/height.
    await expect(element(by.id('marquee-container'))).toBeVisible();

    // 3. Assert 3D Model Webview container and webview element are visible and rendering
    await expect(element(by.id('model-viewer-hero1'))).toBeVisible();
    await expect(element(by.id('model-viewer-hero1-webview'))).toBeVisible();
  });
});
