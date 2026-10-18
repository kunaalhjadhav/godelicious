"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { API_URL } from "@/lib/api";
import { api2 } from "@/lib/api2";
import { useCart } from "@/lib/useCart";
import { rupees, mealBoxCount } from "@/lib/pricing";

function img(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function MealBoxesPage() {
  const router = useRouter();
  const { items, addItem } = useCart();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState({});

  useEffect(() => {
    api2.listMealBoxes().then(setData).catch((e) => setError(e.message || "Could not load meal boxes"));
  }, []);

  const minQty = data?.minQty || 10;
  const inCart = mealBoxCount(items);
  const picked = Object.values(qty).reduce((a, b) => a + b, 0);
  const total = inCart + picked;
  const missing = Math.max(0, minQty - total);
  const bump = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  function addPicked() {
    for (const b of data.boxes) {
      const n = qty[b.id] || 0;
      if (n > 0) addItem(b, [], n);
    }
    router.push("/cart");
  }

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Nav />
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-2">Meal boxes</h1>
        <p className="text-sm text-ink/60 mb-6">
          Choose at least {minQty} meals in total. You can mix different boxes. Prices are before GST ({data?.gstPercent ?? 5}% is added at checkout).
        </p>
        {!data && !error && <p className="text-ink/40">Loading…</p>}
        {error && <p className="text-chili text-sm">{error}</p>}
        {data && data.boxes.length === 0 && <p className="text-ink/40">No meal boxes yet. Please check back soon.</p>}
        <div className="space-y-4">
          {(data?.boxes || []).map((b) => (
            <div key={b.id} className="bg-white border border-line rounded-sm overflow-hidden">
              <Link href={`/menu/${b.id}`}>
                {img(b.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img(b.imageUrl)} alt={b.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-line" />
                )}
                <div className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${b.isVeg ? "bg-basil" : "bg-chili"}`} />
                    <span className="font-display text-lg text-ink">{b.name}</span>
                  </div>
                  <div className="text-sm font-medium text-ink mt-1">
                    {rupees(b.price)} <span className="text-xs text-ink/50 font-normal">+ GST · {b.mealBoxItems?.length || 0} dishes</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {(b.mealBoxItems || []).slice(0, 6).map((m) =>
                      img(m.item?.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={m.id} src={img(m.item.imageUrl)} alt="" className="w-10 h-10 object-cover rounded-sm" />
                      ) : (
                        <div key={m.id} className="w-10 h-10 bg-line rounded-sm" />
                      )
                    )}
                  </div>
                  <div className="text-xs text-saffron2 mt-2">See what's inside →</div>
                </div>
              </Link>
              <div className="flex items-center justify-end gap-3 p-4 pt-1">
                <button onClick={() => bump(b.id, -1)} className="w-9 h-9 rounded-sm bg-line text-ink">−</button>
                <span className="w-8 text-center font-medium">{qty[b.id] || 0}</span>
                <button onClick={() => bump(b.id, 1)} className="w-9 h-9 rounded-sm bg-line text-ink">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold text-ink">{total} of {minQty} meals</div>
            <div className={`text-xs ${missing === 0 ? "text-basil" : "text-chili"}`}>
              {missing === 0 ? "Minimum reached" : `Add ${missing} more to order`}
            </div>
          </div>
          {picked > 0 ? (
            <button onClick={addPicked} className="btn-accent px-6 py-2.5 text-sm">Add to cart</button>
          ) : (
            <Link href="/cart" className="btn-accent px-6 py-2.5 text-sm">View cart</Link>
          )}
        </div>
      </div>
    </div>
  );
}
