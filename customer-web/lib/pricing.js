// Same sum the server does (backend/src/utils/pricing.js), so the number shown is the number charged:
//   subtotal - coupon = taxable;  taxable + GST + delivery - reward points = total.
// GST is added on top of prices. Minimum order and coupon minimum use the subtotal BEFORE the coupon.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function computeTotals({ subtotal, discount = 0, deliveryFee = 0, pointsRupees = 0, gstPercent = 5 }) {
  const sub = round2(subtotal);
  const disc = round2(Math.min(Math.max(Number(discount) || 0, 0), sub));
  const taxable = round2(sub - disc);
  const gst = round2(taxable * ((Number(gstPercent) || 0) / 100));
  const fee = round2(deliveryFee);
  const points = Math.max(0, Math.min(Math.floor(Number(pointsRupees) || 0), Math.floor(taxable + gst + fee)));
  return { subtotal: sub, discount: disc, taxable, gst, deliveryFee: fee, pointsRupees: points, total: round2(taxable + gst + fee - points) };
}

export function rupees(n) {
  const num = Number(n) || 0;
  const whole = Math.abs(num - Math.round(num)) < 0.005;
  return `₹${(whole ? Math.round(num) : round2(num)).toLocaleString("en-IN", whole ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function mealBoxCount(items) {
  return (items || []).reduce((n, l) => n + (l.menuItem?.isMealBox ? l.quantity : 0), 0);
}

// Cash on delivery rules (same as the server): none up to the minimum, then a part paid online first.
export function codRuleFor(total, rules) {
  const r = { minTotal: 3000, tier2Total: 6000, advancePct1: 25, advancePct2: 50, ...(rules || {}) };
  const t = Math.round((Number(total) || 0) * 100) / 100;
  if (!(t > r.minTotal)) return { allowed: false, minTotal: r.minTotal, advancePercent: 100, advance: t, balance: 0 };
  const pct = t > r.tier2Total ? r.advancePct2 : r.advancePct1;
  const advance = Math.ceil((t * pct) / 100);
  return { allowed: true, minTotal: r.minTotal, advancePercent: pct, advance, balance: Math.round((t - advance) * 100) / 100 };
}
