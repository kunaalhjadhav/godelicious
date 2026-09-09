"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Nav from "@/components/Nav";
import OrderTypesSection from "@/components/OrderTypesSection";
import ComboPickerModal from "@/components/ComboPickerModal";
import { api, API_URL } from "@/lib/api";
import { useCart } from "@/lib/useCart";

function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function MenuCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden flex flex-col">
      <div className="h-32 skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 skeleton" />
        <div className="h-3 w-full skeleton" />
        <div className="h-3 w-4/5 skeleton" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comboItem, setComboItem] = useState(null);
  const { addItem } = useCart();
  const router = useRouter();

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

  useEffect(() => {
    api.listCategories().then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listMenu(activeCategory)
      .then((d) => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <OrderTypesSection />

      {/* Menu */}
      <section id="menu" className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm border transition-colors ${
              activeCategory === null ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink bg-white hover:border-saffron2"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm border transition-colors ${
                activeCategory === c.id ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink bg-white hover:border-saffron2"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <MenuCardSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-ink/40 text-sm py-10 text-center">No items in this category right now.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
            {items.map((item) => (
              <div key={item.id} className="card-surface card-surface--interactive overflow-hidden flex flex-col">
                <Link href={`/menu/${item.id}`} className="block">
                  <div className="h-56 bg-paper flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-contain" />
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
                  {item.description && (
                    <p className="text-sm text-ink/60 mb-3 line-clamp-2">{item.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-mono font-medium text-ink">
                      ₹{item.price}{item.soldByWeight ? " / kg" : ""}
                    </span>
                    <button
                      onClick={() => handleAddClick(item)}
                      className="btn-accent text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={13} /> {item.isCombo || item.soldByWeight ? "Customize" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {comboItem && (
        <ComboPickerModal item={comboItem} onConfirm={confirmCombo} onClose={() => setComboItem(null)} />
      )}
    </div>
  );
}
