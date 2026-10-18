"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useCart } from "@/lib/useCart";
import { api2 } from "@/lib/api2";
import { computeTotals, rupees, mealBoxCount } from "@/lib/pricing";

export default function CartPage() {
  const { items, totalAmount, addItem, decrementItem, updateQuantity, removeItem } = useCart();
  const [settings, setSettings] = useState(null);
  useEffect(() => { api2.getSettings().then((d) => setSettings(d.settings)).catch(() => {}); }, []);
  const gstPercent = settings?.gstPercent ?? 5;
  const totals = computeTotals({ subtotal: totalAmount, gstPercent });
  const boxQty = mealBoxCount(items);
  const boxMin = settings?.mealBoxMinQty ?? 10;
  const needMore = boxQty > 0 && boxQty < boxMin;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-6">Your cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink/50 mb-3">Your cart is empty.</p>
            <Link href="/" className="text-saffron2 font-medium hover:underline">Browse the menu →</Link>
          </div>
        ) : (
          <>
            <div className="bg-white border border-line rounded-sm divide-y divide-line mb-6">
              {items.map((line) => (
                <div key={line.key} className="flex items-center gap-4 p-4">
                  <div className="flex-1">
                    <div className="font-medium text-ink">{line.menuItem.name}</div>
                    {line.selectedOptions?.length > 0 && (
                      <div className="text-xs text-ink/50">
                        {line.selectedOptions.map((o) => o.optionLabel).join(", ")}
                      </div>
                    )}
                    <div className="text-sm text-ink/50">
                      {line.menuItem.soldByWeight ? `₹${line.menuItem.price} / kg` : `₹${line.unitPrice} each`}
                    </div>
                  </div>
                  {line.menuItem.soldByWeight ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(line.key, Math.max(250, line.quantity - 250))}
                        className="w-7 h-7 rounded-sm bg-line text-ink flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-16 text-center font-medium text-sm">{line.quantity}g</span>
                      <button
                        onClick={() => updateQuantity(line.key, line.quantity + 250)}
                        className="w-7 h-7 rounded-sm bg-line text-ink flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementItem(line.key)}
                        className="w-7 h-7 rounded-sm bg-line text-ink flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-medium">{line.quantity}</span>
                      <button
                        onClick={() => addItem(line.menuItem, line.selectedOptions)}
                        className="w-7 h-7 rounded-sm bg-line text-ink flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <div className="w-20 text-right font-mono text-sm">
                    {rupees(line.unitPrice * line.quantity)}
                  </div>
                  <button onClick={() => removeItem(line.key)} className="text-chili text-xs hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {boxQty > 0 && (
              <div className={`mb-4 text-sm px-3 py-2 border-l-2 ${needMore ? "text-chili bg-chili/10 border-chili" : "text-basil bg-basil/10 border-basil"}`}>
                {needMore
                  ? `${boxQty} of ${boxMin} meals. Add ${boxMin - boxQty} more meal box${boxMin - boxQty === 1 ? "" : "es"} to check out.`
                  : `${boxQty} meals. Minimum of ${boxMin} reached.`}
                {needMore && <Link href="/meal-boxes" className="ml-2 underline">Add meal boxes</Link>}
              </div>
            )}

            <div className="bg-white border border-line rounded-sm p-4 mb-6 space-y-1 text-sm">
              <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{rupees(totals.subtotal)}</span></div>
              <div className="flex justify-between text-ink/70"><span>GST ({gstPercent}%)</span><span>{rupees(totals.gst)}</span></div>
              <div className="flex justify-between items-baseline pt-2 border-t border-line">
                <span className="text-ink/60">Total (before delivery and coupon)</span>
                <span className="font-display text-2xl text-ink">{rupees(totals.total)}</span>
              </div>
              <p className="text-xs text-ink/40 pt-1">Coupons apply to the subtotal at checkout; GST is added after the discount.</p>
            </div>

            {needMore ? (
              <span className="btn-primary block text-center py-3 opacity-50 cursor-not-allowed">Proceed to checkout</span>
            ) : (
              <Link href="/checkout" className="btn-primary block text-center py-3">
                Proceed to checkout
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
