"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Minus } from "lucide-react";
import Nav from "@/components/Nav";
import ComboPickerModal from "@/components/ComboPickerModal";
import { api, API_URL } from "@/lib/api";
import { useCart } from "@/lib/useCart";

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

  const { addItem } = useCart();

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
    addItem(item);
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

            <div className="font-display text-2xl text-ink mb-6">
              ₹{item.price}{item.soldByWeight ? " / kg" : ""}
            </div>

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
