"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api2 } from "@/lib/api2";
import { useCart } from "@/lib/useCart";
import { rupees } from "@/lib/pricing";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const OCCASIONS = ["Birthday", "Wedding", "Office lunch", "Pooja", "Housewarming"];
const STYLES = [{ key: "veg", label: "Veg" }, { key: "mixed", label: "Mixed" }, { key: "jain", label: "Jain" }];
const DEFAULT_GUESTS_PER_KG = 10;

const img = (u) => (!u ? null : u.startsWith("http") ? u : `${API_URL}${u}`);

// How much of an item feeds `guests` people: pieces (or grams for items sold by weight).
function qtyFor(item, guests) {
  if (item.soldByWeight) {
    const perKg = item.servesPerUnit > 1 ? item.servesPerUnit : DEFAULT_GUESTS_PER_KG;
    const half = Math.ceil((guests / perKg) * 2); // round up to the next 0.5 kg
    return Math.max(half * 500, item.minOrderGrams || 0);
  }
  return Math.max(1, Math.ceil(guests / Math.max(1, item.servesPerUnit || 1)));
}
const needsOptions = (i) => i.isCombo && i.comboGroups?.length > 0;
const lineCost = (i, q) => Math.round(i.soldByWeight ? (i.price / 1000) * q : i.price * q);
const weightLabel = (g) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);
const qtyText = (i, q) => (i.soldByWeight ? weightLabel(q) : String(q));

export default function PlanPartyPage() {
  const router = useRouter();
  const { addItem, updateQuantity, items: cartItems } = useCart();

  const [occasion, setOccasion] = useState("Wedding");
  const [guests, setGuests] = useState(50);
  const [style, setStyle] = useState("veg");
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [settings, setSettings] = useState(null);
  const [picked, setPicked] = useState({}); // { [id]: { item, qty, manual } }
  const [note, setNote] = useState("");

  useEffect(() => {
    api2.listCategories().then((d) => setCategories(d.categories || [])).catch(() => {});
    api2.listMenuAll().then((d) => setMenu(d.items || [])).catch((e) => setError(e.message));
    api2.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const vegOnly = style !== "mixed" || /pooja|puja|housewarming/i.test(occasion);
  const cap = (item, qty) => Math.min(qty, item.stockQty);
  const inStock = (item) => item.stockQty >= (item.soldByWeight ? Math.max(250, item.minOrderGrams || 0) : 1);

  // When the guest count changes, re-scale every pick the customer hasn't adjusted by hand
  useEffect(() => {
    setPicked((prev) => {
      const next = {};
      for (const [id, e] of Object.entries(prev)) {
        if (vegOnly && !e.item.isVeg) continue;
        next[id] = e.manual ? e : { ...e, qty: cap(e.item, qtyFor(e.item, guests)) };
      }
      return next;
    });
  }, [guests, vegOnly]);

  function pick(item) {
    if (needsOptions(item)) { router.push(`/menu/${item.id}`); return; }
    setPicked((p) => ({ ...p, [item.id]: { item, qty: cap(item, qtyFor(item, guests)), manual: false } }));
  }
  function unpick(id) {
    setPicked((p) => { const n = { ...p }; delete n[id]; return n; });
  }
  function change(id, dir) {
    setPicked((p) => {
      const e = p[id];
      if (!e) return p;
      const step = e.item.soldByWeight ? 500 : 1;
      const min = e.item.soldByWeight ? Math.max(250, e.item.minOrderGrams || 250) : 1;
      const q = e.qty + dir * step;
      if (q < min) { const n = { ...p }; delete n[id]; return n; }
      return { ...p, [id]: { ...e, qty: Math.min(q, e.item.stockQty), manual: true } };
    });
  }

  async function autoPick() {
    setNote("");
    try {
      const plan = await api2.planParty(guests, style, occasion);
      if (!plan.lines?.length) { setNote("No ready-made suggestion yet — please choose the dishes you like below."); return; }
      const next = {};
      for (const l of plan.lines) {
        const full = (menu || []).find((m) => m.id === l.menuItem.id) || l.menuItem;
        if (needsOptions(full)) continue;
        next[full.id] = { item: full, qty: cap(full, l.quantity), manual: false };
      }
      setPicked(next);
    } catch (e) {
      setNote(e.message);
    }
  }

  const visible = useMemo(
    () => (menu || []).filter((m) => (activeCat === "all" || m.categoryId === activeCat) && (!vegOnly || m.isVeg)),
    [menu, activeCat, vegOnly]
  );

  const entries = Object.values(picked);
  const subtotal = entries.reduce((n, e) => n + lineCost(e.item, e.qty), 0);
  const gstPercent = settings?.gstPercent ?? 5;
  const gst = Math.round(subtotal * gstPercent) / 100;
  const boxMin = settings?.mealBoxMinQty ?? 10;
  const boxQty = entries.reduce((n, e) => n + (e.item.isMealBox ? e.qty : 0), 0);
  const boxShort = boxQty > 0 && boxQty < boxMin;

  function checkout() {
    if (!entries.length) return;
    if (boxShort) { setNote(`Meal boxes need at least ${boxMin} in total. You have ${boxQty}.`); return; }
    for (const e of entries) {
      const existing = cartItems.find((l) => l.menuItem.id === e.item.id && !(l.selectedOptions && l.selectedOptions.length));
      if (existing) updateQuantity(existing.key, e.qty);
      else addItem(e.item, [], e.qty);
    }
    router.push("/cart");
  }

  const pill = (on) =>
    `shrink-0 px-4 py-2 rounded-full border text-sm ${on ? "border-saffron2 bg-saffron/10 text-saffron2 font-semibold" : "border-line bg-white text-ink"}`;

  return (
    <div className="min-h-screen bg-paper pb-32">
      <Nav />
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h1 className="font-display text-2xl text-ink mb-1">Plan my party</h1>
        <p className="text-sm text-ink/60 mb-6">Pick your dishes, we set the quantity for your guests, then you check out.</p>

        <div className="text-xs font-mono uppercase tracking-wide text-ink/60 mb-2">Occasion</div>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
          {OCCASIONS.map((o) => <button key={o} onClick={() => setOccasion(o)} className={pill(occasion === o)}>{o}</button>)}
        </div>

        <div className="text-xs font-mono uppercase tracking-wide text-ink/60 mb-2">Guests</div>
        <div className="bg-white border border-line rounded-lg p-4 mb-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setGuests((g) => Math.max(1, g - 5))} className="w-10 h-10 rounded-full border border-line text-xl">−</button>
            <input
              type="number" min={1} max={5000} value={guests}
              onChange={(e) => setGuests(Math.max(1, Math.min(5000, parseInt(e.target.value || "1", 10))))}
              className="text-4xl font-bold text-center w-32 bg-transparent outline-none"
            />
            <button onClick={() => setGuests((g) => Math.min(5000, g + 5))} className="w-10 h-10 rounded-full bg-charcoal text-white text-xl">+</button>
          </div>
          <input
            type="range" min={10} max={250} step={5} value={Math.min(250, Math.max(10, guests))}
            onChange={(e) => setGuests(parseInt(e.target.value, 10))} className="w-full mt-3 accent-[#c97f1f]"
          />
          <div className="flex justify-between text-xs text-ink/50"><span>10</span><span>250+</span></div>
        </div>

        <div className="text-xs font-mono uppercase tracking-wide text-ink/60 mb-2">Food style</div>
        <div className="flex gap-2 mb-6">
          {STYLES.map((s) => <button key={s.key} onClick={() => setStyle(s.key)} className={pill(style === s.key)}>{s.label}</button>)}
        </div>

        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-mono uppercase tracking-wide text-ink/60">Choose your menu</div>
          <button onClick={autoPick} className="text-sm text-saffron2 font-semibold hover:underline">✨ Pick for me</button>
        </div>
        <p className="text-xs text-ink/50 mb-3">Tap Add on the dishes you want. Quantities are set for {guests} guests and you can change them.</p>
        {note && <p className="text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2 mb-3">{note}</p>}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className={pill(activeCat === c.id)}>{c.name}</button>
          ))}
        </div>

        {error && <p className="text-sm text-chili">{error}</p>}
        {menu === null && !error && <p className="text-sm text-ink/50">Loading menu…</p>}
        {menu && visible.length === 0 && <p className="text-sm text-ink/50">Nothing in this category for the chosen food style.</p>}

        <div className="space-y-2">
          {visible.map((item) => {
            const e = picked[item.id];
            const out = !inStock(item);
            return (
              <div key={item.id} className={`flex items-center gap-3 bg-white border rounded-lg p-2.5 ${e ? "border-saffron2 bg-saffron/5" : "border-line"} ${out ? "opacity-50" : ""}`}>
                {img(item.imageUrl) ? (
                  <img src={img(item.imageUrl)} alt={item.name} className="w-14 h-14 rounded-md object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-line" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-3 h-3 border-[1.5px] ${item.isVeg ? "border-green-700" : "border-chili"} flex items-center justify-center`}>
                      <span className={`block w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-700" : "bg-chili"}`} />
                    </span>
                    <span className="text-sm font-semibold text-ink truncate">{item.name}</span>
                  </div>
                  <div className="text-xs text-ink/50">
                    {rupees(item.price)}{item.soldByWeight ? " / kg" : ""}
                    {item.servesPerUnit > 1 ? ` · serves ${item.servesPerUnit}${item.soldByWeight ? " per kg" : ""}` : ""}
                  </div>
                  {out && <div className="text-xs text-chili">Out of stock</div>}
                  {!out && e && !e.manual && e.qty < qtyFor(item, guests) && <div className="text-xs text-chili">Only {qtyText(item, item.stockQty)} left</div>}
                </div>
                {out ? null : e ? (
                  <div className="flex items-center bg-charcoal text-paper rounded-md">
                    <button onClick={() => change(item.id, -1)} className="px-3 py-1.5 text-lg">−</button>
                    <span className="min-w-[2.5rem] text-center text-sm font-semibold">{qtyText(item, e.qty)}</span>
                    <button onClick={() => change(item.id, 1)} className="px-3 py-1.5 text-lg">+</button>
                  </div>
                ) : (
                  <button onClick={() => pick(item)} className="border-[1.5px] border-saffron2 text-saffron2 font-semibold text-sm rounded-md px-4 py-1.5">
                    {needsOptions(item) ? "Choose" : "Add"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {entries.length > 0 && (
          <div className="bg-white border border-line rounded-lg p-4 mt-6">
            <div className="text-xs font-mono uppercase tracking-wide text-ink/60 mb-2">Your selection</div>
            {entries.map((e) => (
              <div key={e.item.id} className="flex items-center justify-between py-2 border-t border-line first:border-0 text-sm">
                <span className="flex-1">{e.item.name}</span>
                <span className="font-semibold mr-2">{qtyText(e.item, e.qty)}</span>
                <span className="text-ink/50 mr-3">{rupees(lineCost(e.item, e.qty))}</span>
                <button onClick={() => unpick(e.item.id)} className="text-chili">✕</button>
              </div>
            ))}
            {boxShort && <p className="text-xs text-chili mt-2">Meal boxes need at least {boxMin} in total (you have {boxQty}).</p>}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line z-30 md:pb-0 pb-14">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-ink/50">{entries.length} {entries.length === 1 ? "item" : "items"} · {guests} guests</div>
            <div className="text-xl font-bold text-charcoal">{rupees(subtotal + gst)}</div>
            <div className="text-[11px] text-ink/50">incl. {gstPercent}% GST · delivery at checkout</div>
          </div>
          <button onClick={checkout} disabled={!entries.length} className="btn-primary px-6 py-3 disabled:opacity-40">
            Review &amp; checkout
          </button>
        </div>
      </div>
    </div>
  );
}
