"use client";

import Link from "next/link";
import Nav from "@/components/Nav";
import { useCart } from "@/lib/useCart";

export default function CartPage() {
  const { items, totalAmount, addItem, decrementItem, updateQuantity, removeItem } = useCart();

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
                    ₹{(line.unitPrice * line.quantity).toFixed(0)}
                  </div>
                  <button onClick={() => removeItem(line.key)} className="text-chili text-xs hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <span className="text-ink/60">Total</span>
              <span className="font-display text-2xl text-ink">₹{totalAmount.toFixed(0)}</span>
            </div>

            <Link
              href="/checkout"
              className="btn-primary block text-center py-3"
            >
              Proceed to checkout
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
