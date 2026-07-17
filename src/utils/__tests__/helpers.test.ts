import {
  sanitizeText,
  calculateTaxRate,
  calculateShipping,
  calculateTax,
  formatCurrency,
} from '../helpers';

describe('Helpers Utility Functions', () => {
  describe('sanitizeText', () => {
    it('should strip HTML/XML tags from text', () => {
      expect(sanitizeText('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
      expect(sanitizeText('<div>Test <br/> content</div>')).toBe('Test  content');
    });

    it('should strip RTLO and other bidi control characters', () => {
      expect(sanitizeText('Hello\u202EWorld')).toBe('HelloWorld');
      expect(sanitizeText('\uFEFFCleaned\u200BText')).toBe('CleanedText');
    });

    it('should remove non-printable ASCII control characters', () => {
      expect(sanitizeText('Line\x00One\x08Two')).toBe('LineOneTwo');
    });

    it('should trim whitespace around output', () => {
      expect(sanitizeText('  Hello   ')).toBe('Hello');
    });

    it('should return empty string for null/undefined/empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
    });
  });

  describe('calculateTaxRate', () => {
    it('should return 8.25% for CA', () => {
      expect(calculateTaxRate('CA')).toBe(0.0825);
      expect(calculateTaxRate('California')).toBe(0.0825);
      expect(calculateTaxRate('  ca  ')).toBe(0.0825);
    });

    it('should return 8.875% for NY', () => {
      expect(calculateTaxRate('NY')).toBe(0.08875);
      expect(calculateTaxRate('New York')).toBe(0.08875);
      expect(calculateTaxRate('  ny  ')).toBe(0.08875);
    });

    it('should return default 7.0% for other states', () => {
      expect(calculateTaxRate('TX')).toBe(0.0700);
      expect(calculateTaxRate('FL')).toBe(0.0700);
      expect(calculateTaxRate('')).toBe(0.0700);
    });
  });

  describe('calculateShipping', () => {
    it('should return $0 for subtotal >= 50', () => {
      expect(calculateShipping(50)).toBe(0);
      expect(calculateShipping(75.5)).toBe(0);
    });

    it('should return $5.99 for subtotal < 50', () => {
      expect(calculateShipping(0)).toBe(5.99);
      expect(calculateShipping(49.99)).toBe(5.99);
    });

    it('should return $5.99 for negative values', () => {
      expect(calculateShipping(-10)).toBe(5.99);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax on taxable amount (subtotal - discount)', () => {
      expect(calculateTax(100, 20, 0.0825)).toBe(80 * 0.0825);
      expect(calculateTax(50, 0, 0.07)).toBe(50 * 0.07);
    });

    it('should return 0 if discount is greater than subtotal', () => {
      expect(calculateTax(50, 60, 0.0825)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers to currency strings', () => {
      expect(formatCurrency(29.99)).toBe('$29.99');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1250.5)).toBe('$1250.50');
    });

    it('should return $0.00 for negative values or NaN', () => {
      expect(formatCurrency(-5.0)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });
  });
});
