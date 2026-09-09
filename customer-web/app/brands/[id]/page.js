"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import ComboPickerModal from "@/components/ComboPickerModal";
import { api, API_URL } from "@/lib/api";
import { useCart } from "@/lib/useCart";

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BrandDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [brand, setBrand] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comboItem, setComboItem] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    api.listBrandsPublic().then((d) => {
      setBrand(d.brands.find((b) => b.id === id) || null);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    api.listMenuByBrand(id).then((d) => setItems(d.items)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function handleAddClick(item) {
    if (item.soldByWeight) {
      router.push(`/menu/${item.id}`);
    } else if (item.isCombo && item.comboGroups?.length > 0) {
      setComboItem(item);
    } else {
      addItem(item);
    }
  }

  function confirmCombo(selectedOptions) {
    addItem(comboItem, selectedOptions);
    setComboItem(null);
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <div className="bg-charcoal text-paper">
        <div className="max-w-4xl mx-auto px-5 py-8">
          <Link href="/brands" className="text-xs text-saffron hover:underline mb-3 inline-block">← All brand partners</Link>
          <div className="flex items-center gap-4">
            {brand?.logoUrl && (
              <img src={resolveUrl(brand.logoUrl)} alt="" className="w-14 h-14 rounded-sm object-cover" />
            )}
            <h1 className="font-display text-2xl">{brand?.name || "Loading…"}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10">
        {loading ? (
          <p className="text-sm text-ink/40">Loading menu…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/40">This brand doesn't have any items listed yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="card-surface card-surface--interactive overflow-hidden flex flex-col">
                <Link href={`/menu/${item.id}`} className="block">
                  <div className="h-56 bg-paper flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img src={resolveUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-line" />
                    )}
                  </div>
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-basil" : "bg-chili"}`} />
                    <Link href={`/menu/${item.id}`} className="font-display text-lg text-ink hover:text-saffron2">
                      {item.name}
                    </Link>
                    {item.isCombo && (
                      <span className="text-[10px] font-mono uppercase bg-saffron/20 text-saffron2 px-1.5 py-0.5 rounded-sm">
                        Combo
                      </span>
                    )}
                    {item.soldByWeight && (
                      <span className="text-[10px] font-mono uppercase bg-basil/15 text-basil px-1.5 py-0.5 rounded-sm">
                        Per kg
                      </span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-ink/60 mb-3 line-clamp-2">{item.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-mono font-medium text-ink">₹{item.price}{item.soldByWeight ? " / kg" : ""}</span>
                    <button
                      onClick={() => handleAddClick(item)}
                      className="btn-accent text-xs"
                    >
                      {item.isCombo || item.soldByWeight ? "Customize" : "Add to cart"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {comboItem && (
        <ComboPickerModal item={comboItem} onConfirm={confirmCombo} onClose={() => setComboItem(null)} />
      )}
    </div>
  );
}
