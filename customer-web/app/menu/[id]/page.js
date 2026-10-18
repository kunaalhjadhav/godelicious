"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Minus } from "lucide-react";
import Nav from "@/components/Nav";
import ComboPickerModal from "@/components/ComboPickerModal";
import { api, API_URL } from "@/lib/api";
import { useCart } from "@/lib/useCart";
import { api2 } from "@/lib/api2";
import { mealBoxCount } from "@/lib/pricing";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function MenuItemDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [grams, setGrams] = useState(250);

  useEffect(() => {
    setLoading(true);
    api.getMenuItem(id).then((d) => setItem(d.item)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const { addItem, items: cartItems } = useCart();
  const [boxMin, setBoxMin] = useState(10);
  const [qty, setQty] = useState(1);
  const inCartBoxes = mealBoxCount(cartItems);

  useEffect(() => { api2.getSettings().then((d) => setBoxMin(d.settings?.mealBoxMinQty || 10)).catch(() => {}); }, []);
  // For a meal box, start at the number still needed to reach the minimum
  useEffect(() => {
    if (item?.isMealBox) setQty(Math.max(1, boxMin - inCartBoxes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, boxMin]);

  function handlePrimaryAction() {
    if (!item) return;
    if (item.soldByWeight) {
      addItem(item, [], grams);
      router.push("/cart");
      return;
    }
    if (item.isCombo && item.comboGroups?.length > 0) {
      setComboOpen(true);
      return;
    }
    addItem(item, [], item.isMealBox ? qty : 1);
    router.push("/cart");
  }

  function confirmCombo(selectedOptions) {
    addItem(item, selectedOptions);
    setComboOpen(false);
    router.push("/cart");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <p className="max-w-4xl mx-auto px-5 py-16 text-center text-ink/40">Loading…</p>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <p className="max-w-4xl mx-auto px-5 py-16 text-center text-chili">{error}</p>
      </div>
    );
  }

  const weightTotal = item?.soldByWeight ? ((item.price / 1000) * grams).toFixed(0) : null;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-4xl mx-auto px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-saffron2 hover:underline mb-5">
          <ChevronLeft size={16} /> Back to menu
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="card-surface h-96 md:h-[28rem] bg-paper flex items-center justify-center overflow-hidden">
            {item.imageUrl ? (
              <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-line" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? "bg-basil" : "bg-chili"}`} />
              <h1 className="font-display text-3xl text-ink">{item.name}</h1>
            </div>
            <div className="flex gap-2 mb-4">
              {item.isCombo && (
                <span className="text-xs font-mono uppercase bg-saffron/20 text-saffron2 px-2 py-1 rounded-sm">Combo</span>
              )}
              {item.soldByWeight && (
                <span className="text-xs font-mono uppercase bg-basil/15 text-basil px-2 py-1 rounded-sm">Sold per kg</span>
              )}
              {item.category?.name && (
                <span className="text-xs font-mono uppercase bg-line text-ink/60 px-2 py-1 rounded-sm">{item.category.name}</span>
              )}
            </div>

            {item.description && <p className="text-ink/70 mb-6 leading-relaxed">{item.description}</p>}

            {item.isMealBox && (
              <div className="mb-6">
                <h2 className="font-display text-lg text-ink mb-3">What's in this box</h2>
                <div className="space-y-2">
                  {(item.mealBoxItems || []).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 bg-white border border-line rounded-sm p-2">
                      {m.item?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveImageUrl(m.item.imageUrl)} alt={m.item.name} className="w-16 h-16 object-cover rounded-sm" />
                      ) : (
                        <div className="w-16 h-16 bg-line rounded-sm" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink">{m.item?.name}</div>
                        {m.note && <div className="text-xs text-ink/50">{m.note}</div>}
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full mr-2 ${m.item?.isVeg ? "bg-basil" : "bg-chili"}`} />
                    </div>
                  ))}
                  {(item.mealBoxItems || []).length === 0 && (
                    <p className="text-sm text-ink/40">The dishes in this box will be listed here.</p>
                  )}
                </div>
              </div>
            )}

            <div className="font-display text-2xl text-ink mb-2">
              ₹{item.price}{item.soldByWeight ? " / kg" : item.isMealBox ? " per box" : ""}
              <span className="text-xs font-sans text-ink/50"> + GST</span>
            </div>
            {item.isMealBox && (
              <div className="mb-6">
                <p className="text-xs text-ink/60 mb-3">
                  Minimum {boxMin} meals per order. You can mix different meal boxes.
                  {inCartBoxes > 0 ? ` You already have ${inCartBoxes} in your cart.` : ""}
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-sm bg-line text-ink flex items-center justify-center"><Minus size={16} /></button>
                  <span className="w-10 text-center font-medium">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 rounded-sm bg-line text-ink flex items-center justify-center"><Plus size={16} /></button>
                </div>
              </div>
            )}
            {!item.isMealBox && <div className="mb-4" />}

            {error && <p className="text-chili text-sm mb-4">{error}</p>}

            {item.soldByWeight && (
              <div className="card-surface p-5 mb-6">
                <label className="field-label">Quantity (grams)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGrams((g) => Math.max(250, g - 250))}
                    className="w-9 h-9 rounded-sm bg-line text-ink flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number" value={grams} step={250} min={250}
                    onChange={(e) => setGrams(Math.max(250, Number(e.target.value)))}
                    className="field-input w-28 text-center"
                  />
                  <button
                    onClick={() => setGrams((g) => g + 250)}
                    className="w-9 h-9 rounded-sm bg-line text-ink flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-sm text-ink/50">= {(grams / 1000).toFixed(2)} kg</span>
                </div>
                <p className="text-sm text-ink/60 mt-3">
                  Line total: <span className="font-medium text-ink">₹{weightTotal}</span>
                </p>
                <p className="text-xs text-ink/40 mt-1">
                  Your cart's total (across all items) needs to reach the store's minimum order
                  value at checkout — this item doesn't need to hit it alone.
                </p>
              </div>
            )}

            <button onClick={handlePrimaryAction} className="btn-accent w-full py-3 text-sm inline-flex items-center justify-center gap-2">
              <Plus size={16} />
              {item.soldByWeight ? "Add to cart" : item.isCombo ? "Customize & add" : "Add to cart"}
            </button>
          </div>
        </div>
      </div>

      {comboOpen && (
        <ComboPickerModal item={item} onConfirm={confirmCombo} onClose={() => setComboOpen(false)} />
      )}
    </div>
  );
}
