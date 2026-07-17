import fs from 'fs';
import path from 'path';

describe('PayPal payment hardening', () => {
  const functionSource = fs.readFileSync(
    path.join(process.cwd(), 'supabase/functions/paypal-checkout/index.ts'),
    'utf8'
  );

  it('requires an authenticated user before creating or capturing PayPal orders', () => {
    expect(functionSource).toContain('getAuthenticatedUser');
    expect(functionSource).toContain('assertOrderOwner');
  });

  it('does not allow service-role lookups to bypass order ownership checks', () => {
    expect(functionSource).toContain('Forbidden: order does not belong to the authenticated user');
  });
});
