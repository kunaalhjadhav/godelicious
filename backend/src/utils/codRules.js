// Cash on delivery rules by order total (rupees):
//   up to 3,000          -> no COD, pay online
//   above 3,000 to 6,000 -> COD allowed with a 25% advance paid online
//   above 6,000          -> COD allowed with a 50% advance paid online
// The limits can be changed on Render without code changes:
//   COD_MIN_TOTAL (3000), COD_TIER2_TOTAL (6000), COD_ADVANCE_PCT_1 (25), COD_ADVANCE_PCT_2 (50)
const num = (v, d) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : d);

function codConfig() {
  return {
    minTotal: num(process.env.COD_MIN_TOTAL, 3000),
    tier2Total: num(process.env.COD_TIER2_TOTAL, 6000),
    advancePct1: num(process.env.COD_ADVANCE_PCT_1, 25),
    advancePct2: num(process.env.COD_ADVANCE_PCT_2, 50),
  };
}

// Returns { allowed, advancePercent, advance, balance, message? } for an order total.
function codRule(total) {
  const c = codConfig();
  const t = Math.round(Number(total) * 100) / 100;
  if (!(t > c.minTotal)) {
    return {
      allowed: false, advancePercent: 100, advance: t, balance: 0,
      message: `Cash on delivery is available for orders above ₹${c.minTotal.toLocaleString("en-IN")}. Please pay online.`,
    };
  }
  const pct = t > c.tier2Total ? c.advancePct2 : c.advancePct1;
  const advance = Math.ceil((t * pct) / 100);
  return { allowed: true, advancePercent: pct, advance, balance: Math.round((t - advance) * 100) / 100 };
}

module.exports = { codRule, codConfig };
