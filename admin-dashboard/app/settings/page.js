"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [codEnabled, setCodEnabled] = useState(true);
  const [staffPricePerPerson, setStaffPricePerPerson] = useState("");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState("0");
  const [subscriptionDiscountPct, setSubscriptionDiscountPct] = useState("8");
  const [referralBonusPoints, setReferralBonusPoints] = useState("1000");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((d) => {
      setMinOrderAmount(String(d.settings.minOrderAmount));
      setCodEnabled(d.settings.codEnabled);
      setStaffPricePerPerson(String(d.settings.staffPricePerPerson ?? 0));
      setAdminWhatsapp(d.settings.adminWhatsapp || "");
      setWhatsappAlerts(d.settings.whatsappAlerts !== false);
      setDeliveryFee(String(d.settings.deliveryFee ?? 0));
      setFreeDeliveryAbove(String(d.settings.freeDeliveryAbove ?? 0));
      setSubscriptionDiscountPct(String(d.settings.subscriptionDiscountPct ?? 8));
      setReferralBonusPoints(String(d.settings.referralBonusPoints ?? 1000));
    }).catch((e) => setError(e.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      await api.updateSettings({ minOrderAmount: Number(minOrderAmount), codEnabled, staffPricePerPerson: Number(staffPricePerPerson), adminWhatsapp, whatsappAlerts,
        deliveryFee: Number(deliveryFee), freeDeliveryAbove: Number(freeDeliveryAbove),
        subscriptionDiscountPct: Number(subscriptionDiscountPct), referralBonusPoints: Number(referralBonusPoints),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Settings</h1>
      <p className="text-sm text-ink/50 mb-6">Store-wide ordering rules</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <form onSubmit={handleSave} className="bg-white border border-line rounded-sm p-6 max-w-md">
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Minimum order amount (₹)</label>
        <input
          type="number" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-4 -mt-3">Orders below this total will be rejected at checkout. Set to 0 for no minimum.</p>

        <label className="flex items-center gap-2 text-sm mb-1">
          <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} />
          Allow Cash on Delivery
        </label>
        <p className="text-xs text-ink/40 mb-5">When off, customers can only pay online at checkout.</p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Staff price per person (₹)</label>
        <input
          type="number" value={staffPricePerPerson} onChange={(e) => setStaffPricePerPerson(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-5 -mt-3">
          Charged per staff member when a customer requests staffing on a Catering/Delivery booking.
        </p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Delivery fee (₹)</label>
        <input
          type="number" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Free delivery above (₹)</label>
        <input
          type="number" min="0" value={freeDeliveryAbove} onChange={(e) => setFreeDeliveryAbove(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-5">
          Delivery fee 0 means delivery is always free. If you set a fee, carts at or above the "free delivery" amount
          pay no fee, and the app shows customers how far they are from it.
        </p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Weekly meal box saving (%)</label>
        <input
          type="number" min="0" max="50" value={subscriptionDiscountPct} onChange={(e) => setSubscriptionDiscountPct(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Referral reward (points, each side)</label>
        <input
          type="number" min="0" value={referralBonusPoints} onChange={(e) => setReferralBonusPoints(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-5">
          10 points = ₹1. Customers earn 1 point per ₹10 on delivered orders. The referral reward is paid to both
          people when the friend's first order is delivered (1000 points = ₹100).
        </p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">WhatsApp number for order alerts</label>
        <input
          type="tel" placeholder="919916989185" value={adminWhatsapp} onChange={(e) => setAdminWhatsapp(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-3">
          With country code, digits only (91 + 10-digit number). Every new order is sent here on WhatsApp.
          Needs the WhatsApp Business API variables set on the backend — see the setup guide.
        </p>
        <label className="flex items-center gap-2 text-sm mb-5">
          <input type="checkbox" checked={whatsappAlerts} onChange={(e) => setWhatsappAlerts(e.target.checked)} />
          Send WhatsApp alerts
        </label>

        <button
          type="submit" disabled={saving}
          className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="ml-3 text-sm text-basil">✓ Saved</span>}
      </form>
    </Shell>
  );
}
