import { DiscountType } from "@prisma/client";

import {
  applyDiscount,
  computeInvoiceTotals,
} from "./finance-computation.util";

describe("applyDiscount", () => {
  it("applies a percentage discount", () => {
    expect(applyDiscount(60000, DiscountType.PERCENTAGE, 10)).toBe(6000);
  });

  it("applies a flat discount capped at the base", () => {
    expect(applyDiscount(60000, DiscountType.FLAT, 5000)).toBe(5000);
    expect(applyDiscount(60000, DiscountType.FLAT, 99999)).toBe(60000);
  });
});

describe("computeInvoiceTotals", () => {
  it("applies discount then scholarship sequentially", () => {
    const result = computeInvoiceTotals({
      subtotal: 60000,
      discount: { type: DiscountType.PERCENTAGE, value: 10 },
      scholarship: { type: DiscountType.PERCENTAGE, value: 20 },
    });
    // 60000 -> -10% (6000) = 54000 -> -20% (10800) = 43200
    expect(result.discountAmount).toBe(6000);
    expect(result.scholarshipAmount).toBe(10800);
    expect(result.total).toBe(43200);
  });

  it("handles no discount or scholarship", () => {
    const result = computeInvoiceTotals({ subtotal: 50000 });
    expect(result.discountAmount).toBe(0);
    expect(result.scholarshipAmount).toBe(0);
    expect(result.total).toBe(50000);
  });

  it("applies a flat scholarship against the discounted amount", () => {
    const result = computeInvoiceTotals({
      subtotal: 60000,
      discount: { type: DiscountType.PERCENTAGE, value: 50 },
      scholarship: { type: DiscountType.FLAT, value: 10000 },
    });
    // 60000 -> -50% = 30000 -> -10000 flat = 20000
    expect(result.total).toBe(20000);
  });

  it("never returns a negative total", () => {
    const result = computeInvoiceTotals({
      subtotal: 1000,
      discount: { type: DiscountType.FLAT, value: 9999 },
      scholarship: { type: DiscountType.FLAT, value: 9999 },
    });
    expect(result.total).toBe(0);
  });
});
