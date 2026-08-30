import { DiscountType } from "@prisma/client";

export interface DiscountLike {
  type: DiscountType;
  value: number;
}

/** Applies a discount: percentage of the base, or a flat capped amount. */
export function applyDiscount(
  base: number,
  type: DiscountType,
  value: number,
): number {
  if (type === DiscountType.PERCENTAGE) {
    return (base * value) / 100;
  }
  return Math.min(base, value);
}

export interface InvoiceMathInput {
  subtotal: number;
  discount?: DiscountLike | null;
  scholarship?: DiscountLike | null;
}

export interface InvoiceMathResult {
  subtotal: number;
  discountAmount: number;
  scholarshipAmount: number;
  total: number;
}

/**
 * Computes the invoice totals: discount is applied to the subtotal first,
 * then the scholarship is applied to the discounted amount. The final total
 * is never negative.
 */
export function computeInvoiceTotals(
  input: InvoiceMathInput,
): InvoiceMathResult {
  const discountAmount = input.discount
    ? applyDiscount(input.subtotal, input.discount.type, input.discount.value)
    : 0;
  const afterDiscount = input.subtotal - discountAmount;
  const scholarshipAmount = input.scholarship
    ? applyDiscount(
        afterDiscount,
        input.scholarship.type,
        input.scholarship.value,
      )
    : 0;
  const total = Math.max(0, afterDiscount - scholarshipAmount);
  return { subtotal: input.subtotal, discountAmount, scholarshipAmount, total };
}
