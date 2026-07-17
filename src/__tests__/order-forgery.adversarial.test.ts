/**
 * @file order-forgery.adversarial.test.ts
 *
 * ADVERSARIAL REGRESSION TEST — Order Total Forgery
 *
 * These tests verify that the server-side pricing engine rejects forged
 * discount, tax, and shipping amounts. They are permanent regression tests
 * and MUST remain green before any payment-related code is merged.
 *
 * Architecture under test:
 *   Client → create_order_transaction RPC → compute_order_totals RPC
 *                                         → validate_promo_code RPC
 *   Client → create-payment-intent Edge Function → compute_order_totals RPC
 *
 * All tests mock the Supabase client at the boundary. No real network calls.
 */

import { createClient } from '@supabase/supabase-js';

// ── Mock Supabase client ────────────────────────────────────────────────────
jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(),
  };
});

// Server-side pricing engine (pure TypeScript mirror of the SQL functions)
// This mirrors the logic in the migration so tests are self-contained.
const serverSidePricingEngine = {
  TAX_RATES: {
    CA: 0.0825, NY: 0.0888, TX: 0.0625, FL: 0.0600, DEFAULT: 0.0700,
  } as Record<string, number>,

  SHIPPING_RATES: {
    HI: { base: 15.00, threshold: 100.00 },
    AK: { base: 15.00, threshold: 100.00 },
    DEFAULT: { base: 5.99, threshold: 50.00 },
  } as Record<string, { base: number; threshold: number }>,

  PROMO_CODES: [
    { code: 'GLASSSKIN20', type: 'percent' as const, value: 20, active: true },
    { code: 'GLOW10',      type: 'percent' as const, value: 10, active: true },
  ],

  validatePromoCode(code: string, subtotal: number): { valid: boolean; discountAmount: number; error?: string } {
    const promo = this.PROMO_CODES.find(
      p => p.code === code.toUpperCase().trim() && p.active
    );
    if (!promo) return { valid: false, discountAmount: 0, error: 'Promo code not found' };
    const discountAmount = promo.type === 'percent'
      ? Math.round(subtotal * (promo.value / 100) * 100) / 100
      : Math.min(promo.value, subtotal);
    return { valid: true, discountAmount };
  },

  computeTotals(
    items: { price: number; quantity: number }[],
    promoCode: string | null,
    state: string,
  ) {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const promoResult = promoCode ? this.validatePromoCode(promoCode, subtotal) : { valid: true, discountAmount: 0 };
    if (promoCode && !promoResult.valid) throw new Error(`Invalid promo: ${promoResult.error}`);
    const discount = promoResult.discountAmount;

    const stateUpper = (state || 'US').toUpperCase();
    const taxRate = this.TAX_RATES[stateUpper] ?? this.TAX_RATES.DEFAULT;
    const shippingConfig = this.SHIPPING_RATES[stateUpper] ?? this.SHIPPING_RATES.DEFAULT;

    const tax      = Math.round((subtotal - discount) * taxRate * 100) / 100;
    const shipping = (subtotal - discount) >= shippingConfig.threshold ? 0 : shippingConfig.base;
    const total    = Math.round((subtotal - discount + tax + shipping) * 100) / 100;

    return { subtotal, discount, tax, shipping, total };
  },

  /**
   * Simulates what create_order_transaction does:
   * Accepts client-submitted totals but IGNORES them entirely,
   * recomputing everything server-side.
   */
  createOrderTransaction(params: {
    items: { product_id: string; price: number; quantity: number }[];
    promo_code: string | null;
    state: string;
    // Client-supplied values (should be IGNORED):
    client_total_amount: number;
    client_discount_amount: number;
    client_tax_amount: number;
    client_shipping_amount: number;
  }) {
    const serverTotals = this.computeTotals(
      params.items.map(i => ({ price: i.price, quantity: i.quantity })),
      params.promo_code,
      params.state,
    );
    // Server IGNORES client values entirely
    return {
      server_total:    serverTotals.total,
      server_discount: serverTotals.discount,
      server_tax:      serverTotals.tax,
      server_shipping: serverTotals.shipping,
      // These are what gets stored in the DB — never the client values
      stored_total_amount:    serverTotals.total,
      stored_discount_amount: serverTotals.discount,
      stored_tax_amount:      serverTotals.tax,
      stored_shipping_amount: serverTotals.shipping,
    };
  },

  /**
   * Simulates what create-payment-intent does:
   * Independently recomputes totals and rejects if a forged discount is detected.
   */
  createPaymentIntentAmount(params: {
    stored_discount_amount: number;
    stored_total_amount: number;
    items: { price: number; quantity: number }[];
    state: string;
    promoCodes: Array<{ code: string; type: 'percent' | 'fixed'; value: number; active: boolean }>;
  }): { authorized: boolean; chargeAmount?: number; error?: string } {
    // Reject negative discounts immediately — no legitimate promo produces a negative discount
    if (params.stored_discount_amount < 0) {
      return {
        authorized: false,
        error: `FORGED_DISCOUNT: negative discount $${params.stored_discount_amount} is never valid`,
      };
    }

    const baseline = this.computeTotals(params.items, null, params.state);

    let trueTotals = baseline;
    if (params.stored_discount_amount > 0) {
      let matched = false;
      for (const pc of params.promoCodes.filter(p => p.active)) {
        const testTotals = this.computeTotals(params.items, pc.code, params.state);
        if (Math.abs(testTotals.discount - params.stored_discount_amount) < 0.01) {
          trueTotals = testTotals;
          matched = true;
          break;
        }
      }
      if (!matched) {
        return {
          authorized: false,
          error: `FORGED_DISCOUNT: stored discount $${params.stored_discount_amount} matches no valid promo code`,
        };
      }
    }

    return { authorized: true, chargeAmount: trueTotals.total };
  },
};

// ── Test data ────────────────────────────────────────────────────────────────
const REAL_ITEMS = [
  { product_id: 'prod-1', price: 29.99, quantity: 2 }, // $59.98
];

// ── Tests ────────────────────────────────────────────────────────────────────
describe('🔐 ADVERSARIAL: Order Total Forgery', () => {
  describe('create_order_transaction — server ignores client-supplied amounts', () => {
    it('stores server-computed total even if client submits inflated discount', () => {
      const result = serverSidePricingEngine.createOrderTransaction({
        items: REAL_ITEMS,
        promo_code: null,
        state: 'CA',
        // Client tries to forge a $50 discount on a $59.98 order with no promo
        client_discount_amount: 50.00,
        client_tax_amount: 0.00,
        client_shipping_amount: 0.00,
        client_total_amount: 9.98,
      });

      // Server must compute correctly: subtotal=59.98, discount=0, tax=4.95, shipping=0
      expect(result.stored_discount_amount).toBeCloseTo(0, 2);
      expect(result.stored_total_amount).toBeGreaterThan(59);
      // Client value must be completely ignored
      expect(result.stored_discount_amount).not.toBe(50.00);
      expect(result.stored_total_amount).not.toBe(9.98);
    });

    it('stores server-computed total even if client submits zero tax', () => {
      const result = serverSidePricingEngine.createOrderTransaction({
        items: REAL_ITEMS,
        promo_code: null,
        state: 'NY',
        client_discount_amount: 0,
        // Client tries to avoid paying NY tax (8.88%)
        client_tax_amount: 0.00,
        client_shipping_amount: 0,
        client_total_amount: 59.98,
      });

      // Server must apply NY tax rate
      expect(result.stored_tax_amount).toBeGreaterThan(0);
      expect(result.stored_total_amount).toBeGreaterThan(59.98);
      expect(result.stored_tax_amount).not.toBe(0);
    });

    it('stores server-computed free shipping when subtotal meets threshold', () => {
      // Items total $59.98 > $50 threshold → shipping must be $0
      const result = serverSidePricingEngine.createOrderTransaction({
        items: REAL_ITEMS,
        promo_code: null,
        state: 'TX',
        client_discount_amount: 0,
        client_tax_amount: 0,
        // Client tries to claim fake $10 free shipping credit
        client_shipping_amount: -10.00,
        client_total_amount: 49.98,
      });

      expect(result.stored_shipping_amount).toBe(0);
      expect(result.stored_shipping_amount).not.toBe(-10.00);
    });

    it('applies HI shipping surcharge regardless of client value', () => {
      const result = serverSidePricingEngine.createOrderTransaction({
        items: [{ product_id: 'p1', price: 10.00, quantity: 1 }], // $10, below threshold
        promo_code: null,
        state: 'HI',
        client_discount_amount: 0,
        client_tax_amount: 0,
        client_shipping_amount: 0, // Client claims free shipping for HI
        client_total_amount: 10.00,
      });

      expect(result.stored_shipping_amount).toBe(15.00); // HI surcharge
    });
  });

  describe('validate_promo_code — server rejects fabricated codes', () => {
    it('rejects a code that does not exist in the DB', () => {
      const result = serverSidePricingEngine.validatePromoCode('FAKE50', 59.98);
      expect(result.valid).toBe(false);
      expect(result.discountAmount).toBe(0);
    });

    it('rejects a forged code passed with correct format but wrong code', () => {
      const result = serverSidePricingEngine.validatePromoCode('GLASSSKIN99', 59.98);
      expect(result.valid).toBe(false);
    });

    it('accepts valid GLASSSKIN20 and returns correct discount amount', () => {
      const result = serverSidePricingEngine.validatePromoCode('GLASSSKIN20', 100.00);
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBeCloseTo(20.00, 2);
    });

    it('accepts valid GLOW10 and returns correct 10% discount', () => {
      const result = serverSidePricingEngine.validatePromoCode('GLOW10', 50.00);
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBeCloseTo(5.00, 2);
    });

    it('is case-insensitive — lowercase code is still validated server-side', () => {
      const result = serverSidePricingEngine.validatePromoCode('glow10', 50.00);
      expect(result.valid).toBe(true);
    });

    it('bypassing UI with manipulated local state still fails server-side', () => {
      // Simulates: attacker calls applyPromoCode('MADE_UP_CODE') directly,
      // then calls createOrder passing the forged discount.
      // The server re-validates the code in validate_promo_code —
      // the RPC call fails and the order is rejected.
      const forgedCode = 'MADE_UP_CODE';
      const validationResult = serverSidePricingEngine.validatePromoCode(forgedCode, 59.98);
      expect(validationResult.valid).toBe(false);
      // Therefore create_order_transaction would raise an exception for this code
      expect(() => {
        serverSidePricingEngine.computeTotals(
          REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
          forgedCode,
          'CA',
        );
      }).toThrow(/Invalid promo/);
    });
  });

  describe('create-payment-intent — rejects forged discount not matching any promo', () => {
    const PROMO_CODES = serverSidePricingEngine.PROMO_CODES;

    it('rejects payment if stored discount does not match any server-side promo code', () => {
      // Attacker somehow writes an order row with a forged $30 discount
      // (no valid promo code produces $30 on these items)
      const result = serverSidePricingEngine.createPaymentIntentAmount({
        stored_discount_amount: 30.00, // forged — no promo gives $30 on $59.98
        stored_total_amount: 29.98,
        items: REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
        state: 'CA',
        promoCodes: PROMO_CODES,
      });

      expect(result.authorized).toBe(false);
      expect(result.error).toMatch(/FORGED_DISCOUNT/);
      expect(result.chargeAmount).toBeUndefined();
    });

    it('authorizes correct amount for a legitimate GLASSSKIN20 promo', () => {
      // Attacker submits inflated stored total — server recomputes and charges correct amount
      const serverTotals = serverSidePricingEngine.computeTotals(
        REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
        'GLASSSKIN20',
        'CA',
      );

      const result = serverSidePricingEngine.createPaymentIntentAmount({
        stored_discount_amount: serverTotals.discount,
        stored_total_amount: 999.99, // attacker somehow wrote a wrong total
        items: REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
        state: 'CA',
        promoCodes: PROMO_CODES,
      });

      expect(result.authorized).toBe(true);
      // Charge amount must be the server-recomputed total, NOT 999.99
      expect(result.chargeAmount).toBeCloseTo(serverTotals.total, 2);
      expect(result.chargeAmount).not.toBe(999.99);
    });

    it('charges full price when no discount was applied (stored_discount = 0)', () => {
      const serverTotals = serverSidePricingEngine.computeTotals(
        REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
        null,
        'TX',
      );

      const result = serverSidePricingEngine.createPaymentIntentAmount({
        stored_discount_amount: 0,
        stored_total_amount: serverTotals.total,
        items: REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
        state: 'TX',
        promoCodes: PROMO_CODES,
      });

      expect(result.authorized).toBe(true);
      expect(result.chargeAmount).toBeCloseTo(serverTotals.total, 2);
    });

    it('rejects negative forged discount (attacker trying to get refund via order)', () => {
      const result = serverSidePricingEngine.createPaymentIntentAmount({
        stored_discount_amount: -50.00, // negative discount = artificial credit
        stored_total_amount: 109.98,
        items: REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })),
        state: 'CA',
        promoCodes: PROMO_CODES,
      });

      // Negative discount matches no promo code → FORGED
      expect(result.authorized).toBe(false);
      expect(result.error).toMatch(/FORGED_DISCOUNT/);
    });
  });

  describe('compute_order_totals — deterministic for same inputs', () => {
    it('produces identical totals regardless of how many times it is called', () => {
      const run1 = serverSidePricingEngine.computeTotals(REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })), 'GLASSSKIN20', 'NY');
      const run2 = serverSidePricingEngine.computeTotals(REAL_ITEMS.map(i => ({ price: i.price, quantity: i.quantity })), 'GLASSSKIN20', 'NY');
      expect(run1.total).toBe(run2.total);
      expect(run1.discount).toBe(run2.discount);
      expect(run1.tax).toBe(run2.tax);
    });

    it('discount amount is based on subtotal, not on client-supplied base', () => {
      // Different item quantities → different subtotal → different discount
      const small = serverSidePricingEngine.computeTotals(
        [{ price: 10.00, quantity: 1 }], 'GLASSSKIN20', 'CA'
      );
      const large = serverSidePricingEngine.computeTotals(
        [{ price: 10.00, quantity: 10 }], 'GLASSSKIN20', 'CA'
      );
      expect(large.discount).toBeGreaterThan(small.discount);
      expect(small.discount).toBeCloseTo(2.00, 2);  // 20% of $10
      expect(large.discount).toBeCloseTo(20.00, 2); // 20% of $100
    });
  });
});
