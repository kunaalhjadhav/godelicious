"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { api, API_URL } from "@/lib/api";
import { rupees } from "@/lib/pricing";

const isBuyable = (mi) => mi.isAvailable && mi.stockQty > 0;
const img = (u) => (!u ? null : u.startsWith("http") ? u : `${API_URL}${u}`);

export default function FavouritesPage() {
  const { user, loading } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [favs, setFavs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  const load = useCallback(() => api.myFavorites().then((d) => { setFavs(d.favorites || []); setLoaded(true); }).catch(() => setLoaded(true)), []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const categories = useMemo(() => [...new Set(favs.map((f) => f.menuItem?.category?.name).filter(Boolean))], [favs]);
  const shown = favs.filter((f) => f.menuItem && (!category || f.menuItem.category?.name === category));

  // Weight items go in at 1 kg; combos need their options picked on the item page.
  function addOne(mi) {
    if (mi.isCombo) { router.push(`/menu/${mi.id}`); return false; }
    addItem(mi, [], mi.soldByWeight ? 1000 : 1);
    return true;
  }
  function addAll() {
    let added = 0, skipped = 0;
    for (const f of shown.filter((x) => isBuyable(x.menuItem))) {
      if (f.menuItem.isCombo) { skipped += 1; continue; }
      addItem(f.menuItem, [], f.menuItem.soldByWeight ? 1000 : 1); added += 1;
    }
    if (!added) return setNote(skipped ? "Combos need their options picked. Open each one to add it." : "None of these are available right now.");
    router.push("/cart");
  }
  async function remove(f) {
    setFavs((prev) => prev.filter((x) => x.id !== f.id));
    api.removeFavorite(f.menuItemId).catch(load);
  }
  async function toggleNotify(f) {
    const next = !f.notifyWhenBack;
    setFavs((prev) => prev.map((x) => (x.id === f.id ? { ...x, notifyWhenBack: next } : x)));
    api.setFavoriteNotify(f.menuItemId, next).catch(load);
  }

  if (loading || !user) return null;
  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-10">
      <Nav />
      <div className="max-w-xl mx-auto px-4 py-6">
        <Link href="/profile" className="text-sm text-ink/50">‹ Profile</Link>
        <h1 className="font-display text-2xl text-ink mt-1 mb-4">Favourites</h1>

        {favs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {[{ key: null, label: `All ${favs.length}` }, ...categories.map((c) => ({ key: c, label: c }))].map((c) => (
              <button key={c.label} onClick={() => setCategory(c.key)}
                className={`px-3.5 py-1.5 rounded-full text-sm border whitespace-nowrap ${category === c.key ? "bg-charcoal text-paper border-charcoal" : "bg-white border-line text-ink"}`}>{c.label}</button>
            ))}
          </div>
        )}

        {loaded && favs.length === 0 && (
          <div className="text-center py-14">
            <p className="font-display text-lg text-ink">No favourites yet</p>
            <p className="text-sm text-ink/50 mt-1">Tap the heart on any dish in the app to keep it here for quick reordering.</p>
            <Link href="/" className="inline-block mt-3 text-saffron2 font-bold">Browse the menu →</Link>
          </div>
        )}

        <div className="space-y-2.5">
          {shown.map((f) => {
            const mi = f.menuItem;
            const ok = isBuyable(mi);
            return (
              <div key={f.id} className={`bg-white border border-line rounded-2xl p-3 flex items-center gap-3 ${ok ? "" : "opacity-80"}`}>
                <Link href={`/menu/${mi.id}`} className="shrink-0">
                  {img(mi.imageUrl) ? <img src={img(mi.imageUrl)} alt={mi.name} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-[#E6D8B9]" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink truncate">{mi.name}</div>
                  {ok ? (
                    <div className="text-sm text-ink/50">{rupees(mi.price)}{mi.soldByWeight ? " / kg" : ""}{mi.rating != null ? ` · ${mi.rating.toFixed(1)} rating` : ""}</div>
                  ) : <div className="text-sm text-chili">Not available this week</div>}
                  <button onClick={() => remove(f)} className="text-xs text-ink/40 mt-0.5">Remove</button>
                </div>
                {ok ? (
                  <button onClick={() => { if (addOne(mi)) router.push("/cart"); }} className="bg-charcoal text-paper text-sm font-bold rounded-lg px-4 py-2">
                    {mi.isCombo ? "Customise" : "Add"}
                  </button>
                ) : (
                  <button onClick={() => toggleNotify(f)} className="text-sm font-bold text-saffron2">{f.notifyWhenBack ? "We will tell you ✓" : "Notify me"}</button>
                )}
              </div>
            );
          })}
        </div>
        {note && <p className="text-sm text-ink/60 mt-3">{note}</p>}
        {shown.some((f) => isBuyable(f.menuItem)) && (
          <button onClick={addAll} className="w-full mt-4 bg-saffron text-charcoal rounded-xl py-3.5 font-bold">Add all available to cart</button>
        )}
      </div>
    </div>
  );
}
