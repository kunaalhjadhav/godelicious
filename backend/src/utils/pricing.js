// One place that decides how an order total is worked out, so the order, the
// weekly meal box and the party planner can never disagree.
//
//   subtotal   = food + staff + add-ons (prices do NOT include GST)
//   discount   = coupon discount (taken off the subtotal)
//   taxable    = subtotal - discount
//   GST        = taxable x GST %   (added on top)
//   total      = taxable + GST + delivery fee - reward points
//
// The minimum order and the coupon minimum are checked on the subtotal BEFORE the
// discount, so a coupon can never block checkout by pulling the cart below the minimum.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function computeTotals({ subtotal, discount = 0, deliveryFee = 0, pointsRupees = 0, gstPercent = 5 }) {
  const sub = round2(subtotal);
  const disc = round2(Math.min(Math.max(Number(discount) || 0, 0), sub));
  const taxable = round2(sub - disc);
  const gst = round2(taxable * ((Number(gstPercent) || 0) / 100));
  const fee = round2(deliveryFee);
  const points = Math.max(0, Math.min(Math.floor(Number(pointsRupees) || 0), Math.floor(taxable + gst + fee)));
  const total = round2(taxable + gst + fee - points);
  return { subtotal: sub, discount: disc, taxable, gst, deliveryFee: fee, pointsRupees: points, total };
}

// The smallest cart (before discount) a coupon can be used on: the larger of the
// coupon's own minimum and the shop-wide coupon minimum from Settings.
function couponMinimum(coupon, settings) {
  return Math.max(Number(coupon?.minOrderAmount) || 0, Number(settings?.couponMinOrder) || 0);
}

module.exports = { round2, computeTotals, couponMinimum };
