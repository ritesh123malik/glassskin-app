/**
 * Strips HTML tags and control characters from user-supplied text.
 */
export function sanitizeText(raw: string): string {
  if (!raw) return '';
  return raw
    // Strip HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Remove RTLO and other bidirectional control characters
    .replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    // Remove other ASCII control characters except tab/newline/CR
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Calculates the tax rate based on the US state.
 */
export function calculateTaxRate(state: string): number {
  if (!state) return 0.0700;
  const stateStr = state.toUpperCase().trim();
  if (stateStr === 'CA' || stateStr === 'CALIFORNIA') return 0.0825;
  if (stateStr === 'NY' || stateStr === 'NEW YORK') return 0.08875;
  return 0.0700; // Default flat tax (7.0%)
}

/**
 * Calculates shipping cost based on subtotal.
 * Free shipping above $50.
 */
export function calculateShipping(subtotal: number): number {
  if (subtotal < 0) return 5.99;
  return subtotal >= 50 ? 0 : 5.99;
}

/**
 * Calculates tax amount based on subtotal, discount and tax rate.
 */
export function calculateTax(subtotal: number, discount: number, taxRate: number): number {
  const taxable = subtotal - discount;
  if (taxable < 0) return 0;
  return taxable * taxRate;
}

/**
 * Formats price value as a clean string.
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || value < 0) return '$0.00';
  return `$${value.toFixed(2)}`;
}
