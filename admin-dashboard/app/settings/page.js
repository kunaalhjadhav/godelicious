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
  const [gstPercent, setGstPercent] = useState("5");
  const [couponMinOrder, setCouponMinOrder] = useState("1000");
  const [mealBoxMinQty, setMealBoxMinQty] = useState("10");
  const [serviceAreaOn, setServiceAreaOn] = useState(true);
  const [serviceLat, setServiceLat] = useState("12.322983");
  const [serviceLng, setServiceLng] = useState("76.5878328");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("20");
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
      setGstPercent(String(d.settings.gstPercent ?? 5));
      setCouponMinOrder(String(d.settings.couponMinOrder ?? 1000));
      setMealBoxMinQty(String(d.settings.mealBoxMinQty ?? 10));
      setServiceAreaOn(d.settings.serviceAreaOn ?? true);
      setServiceLat(String(d.settings.serviceLat ?? 12.322983));
      setServiceLng(String(d.settings.serviceLng ?? 76.5878328));
      setServiceRadiusKm(String(d.settings.serviceRadiusKm ?? 20));
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
        gstPercent: Number(gstPercent), couponMinOrder: Number(couponMinOrder), mealBoxMinQty: Number(mealBoxMinQty),
        serviceAreaOn, serviceLat: Number(serviceLat), serviceLng: Number(serviceLng), serviceRadiusKm: Number(serviceRadiusKm),
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
        <p className="text-xs text-ink/40 mb-4 -mt-3">
          Checked on the cart <strong>before</strong> any coupon discount and before GST, so a coupon never blocks checkout.
          Set to 0 for no minimum.
        </p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">GST added at checkout (%)</label>
        <input
          type="number" min="0" max="28" step="any" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-4">
          Added on top of the item prices, after the coupon discount (5 = 5%). Menu prices you enter should be <strong>without</strong> GST.
        </p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Coupons work when the cart is at least (₹)</label>
        <input
          type="number" min="0" value={couponMinOrder} onChange={(e) => setCouponMinOrder(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-4">
          Measured before the discount. After the coupon is applied the order can go below this amount and still be placed.
          A coupon's own minimum (under Coupons) can be higher, never lower.
        </p>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Meal boxes: minimum meals per order</label>
        <input
          type="number" min="1" value={mealBoxMinQty} onChange={(e) => setMealBoxMinQty(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <p className="text-xs text-ink/40 mb-5">
          Counted across all meal boxes in the cart, so a customer can mix boxes (for example 6 + 4 = 10).
        </p>

        <label className="flex items-center gap-2 text-sm mb-1">
          <input type="checkbox" checked={serviceAreaOn} onChange={(e) => setServiceAreaOn(e.target.checked)} />
          Only deliver inside the service area
        </label>
        <div className="grid grid-cols-3 gap-2 mb-1">
          <div>
            <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Latitude</label>
            <input type="number" step="any" value={serviceLat} onChange={(e) => setServiceLat(e.target.value)} className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Longitude</label>
            <input type="number" step="any" value={serviceLng} onChange={(e) => setServiceLng(e.target.value)} className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Radius (km)</label>
            <input type="number" min="1" step="any" value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)} className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
          </div>
        </div>
        <p className="text-xs text-ink/40 mb-5">
          Orders are accepted only if the delivery location is within this radius of the centre point. Outside it, customers see
          "Service not available to this area yet. Coming shortly. Thank you." The centre is set to Vijayanagar 4th Stage, Mysuru;
          to use your exact house, right-click it in Google Maps and click the numbers to copy latitude and longitude.
        </p>

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
