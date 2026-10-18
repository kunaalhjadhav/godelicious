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
