"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { MapPin, CheckCircle2 } from "lucide-react";
import Nav from "@/components/Nav";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BookingPage() {
  const { orderTypeId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [orderType, setOrderType] = useState(null);
  const [settings, setSettings] = useState(null);
  const [allAddons, setAllAddons] = useState([]);

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const [needsStaff, setNeedsStaff] = useState(false);
  const [staffCount, setStaffCount] = useState("1");
  const [selectedAddons, setSelectedAddons] = useState({});

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=/booking/${orderTypeId}`);
  }, [loading, user, router, orderTypeId]);

  useEffect(() => {
    api.listOrderTypes().then((d) => {
      const found = d.orderTypes.find((ot) => ot.id === orderTypeId);
      setOrderType(found || null);
    }).catch(() => {});
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
    api.listAddons().then((d) => setAllAddons(d.addons)).catch(() => {});
  }, [orderTypeId]);

  function toggleAddon(addonId) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[addonId]) delete next[addonId];
      else next[addonId] = 1;
      return next;
    });
  }

  function setAddonQty(addonId, qty) {
    setSelectedAddons((prev) => ({ ...prev, [addonId]: Math.max(1, qty) }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — check browser permissions, or enter your address manually.");
        setLocating(false);
      }
    );
  }

  const staffCost = needsStaff ? (Number(staffCount) || 0) * (settings?.staffPricePerPerson || 0) : 0;
  const addonsCost = Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
    const addon = allAddons.find((a) => a.id === addonId);
    return sum + (addon ? addon.price * qty : 0);
  }, 0);
  const subtotal = staffCost + addonsCost;
  const discount = couponStatus?.discountAmount || 0;
  const finalTotal = Math.max(0, subtotal - discount);
  const belowMinimum = settings && finalTotal < settings.minOrderAmount && finalTotal > 0;

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const data = await api.validateCoupon(couponCode.trim(), subtotal);
      setCouponStatus({ discountAmount: data.discountAmount });
    } catch (err) {
      setCouponStatus({ error: err.message });
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eventDate || !guestCount || !address || !phone) {
      setError("Please fill in date, guest count, address, and phone.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        orderTypeId,
        eventDate,
        eventTime: eventTime || undefined,
        guestCount,
        deliveryAddress: address,
        contactPhone: phone,
        notes,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        needsStaff,
        staffCount: needsStaff ? Number(staffCount) : undefined,
        addons: Object.entries(selectedAddons).map(([addonId, quantity]) => ({ addonId, quantity })),
        couponCode: couponStatus?.discountAmount ? couponCode.trim() : undefined,
        paymentMethod,
      };
      const { order } = await api.createOrder(payload);

      if (paymentMethod === "COD") {
        router.push(`/orders/${order.id}`);
        return;
      }

      if (!razorpayReady || !window.Razorpay) {
        throw new Error("Payment gateway is still loading — please try again in a moment.");
      }
      const rp = await api.createRazorpayOrder(order.id);
      const razorpay = new window.Razorpay({
        key: rp.keyId,
        amount: rp.amount,
        currency: rp.currency,
        order_id: rp.razorpayOrderId,
        name: "Godelicious",
        description: `${orderType?.name || "Booking"} — Order #${order.id.slice(0, 8)}`,
        prefill: { name: user.name, email: user.email, contact: phone },
        theme: { color: "#1C1B19" },
        handler: async (response) => {
          try {
            await api.verifyRazorpayPayment({
              orderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push(`/orders/${order.id}`);
          } catch (err) {
            setError(`Payment succeeded but verification failed: ${err.message}. Contact support with order #${order.id.slice(0, 8)}.`);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError("Payment was cancelled. Your booking is saved but unpaid — you can retry from My Orders.");
          },
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayReady(true)} />
      <Nav />

      {orderType && (
        <div className="bg-charcoal text-paper">
          <div className="max-w-2xl mx-auto px-5 py-8 flex items-center gap-4">
            {orderType.imageUrl && (
              <img src={resolveUrl(orderType.imageUrl)} alt="" className="w-16 h-16 rounded-sm object-cover" />
            )}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-saffron mb-1">Booking</div>
              <h1 className="font-display text-2xl">{orderType.name}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-5 py-10">
        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-6 mb-6">
          <h2 className="font-display text-lg text-ink mb-4">Event details</h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Date</label>
              <input
                type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Time</label>
              <input
                type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)}
                className="field-input"
              />
            </div>
          </div>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Number of guests</label>
          <input
            type="number" required value={guestCount} onChange={(e) => setGuestCount(e.target.value)}
            placeholder="e.g. 50"
            className="field-input mb-3"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Venue address</label>
          <textarea
            required value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
            placeholder="Full address of the event location"
            className="field-input mb-2"
          />
          <button
            type="button" onClick={useMyLocation} disabled={locating}
            className="inline-flex items-center gap-1 text-xs text-saffron2 hover:underline mb-3 disabled:opacity-50"
          >
            {locating ? (
              "Getting location…"
            ) : coords ? (
              <><CheckCircle2 size={13} /> Location captured</>
            ) : (
              <><MapPin size={13} /> Use my current location</>
            )}
          </button>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Contact phone</label>
          <input
            required value={phone} onChange={(e) => setPhone(e.target.value)}
            className="field-input mb-3"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Notes (optional)</label>
          <input
            value={notes} onChange={(e) => setNotes(e.target.value)}
            className="field-input mb-5"
          />

          <div className="border-t border-line pt-4 mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-ink mb-2">
              <input type="checkbox" checked={needsStaff} onChange={(e) => setNeedsStaff(e.target.checked)} />
              Need serving staff for this event?
            </label>
            {needsStaff && (
              <div className="flex items-center gap-3 ml-6">
                <label className="text-xs text-ink/60">Number of staff</label>
                <input
                  type="number" min="1" value={staffCount} onChange={(e) => setStaffCount(e.target.value)}
                  className="field-input" style={{width: 80}}
                />
                {settings && (
                  <span className="text-xs text-ink/50">₹{settings.staffPricePerPerson} / staff — ₹{staffCost.toFixed(0)} total</span>
                )}
              </div>
            )}
          </div>

          {allAddons.length > 0 && (
            <div className="border-t border-line pt-4 mb-4">
              <h3 className="text-sm font-medium text-ink mb-2">Add-ons</h3>
              <div className="space-y-2">
                {allAddons.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={!!selectedAddons[addon.id]}
                        onChange={() => toggleAddon(addon.id)}
                      />
                      {addon.name} <span className="text-ink/40">₹{addon.price}</span>
                    </label>
                    {selectedAddons[addon.id] && (
                      <input
                        type="number" min="1" value={selectedAddons[addon.id]}
                        onChange={(e) => setAddonQty(addon.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-line rounded-sm text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-line pt-4 mb-4">
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Coupon code</label>
            <div className="flex gap-2">
              <input
                value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
                placeholder="e.g. WELCOME10"
                className="field-input flex-1 font-mono"
              />
              <button
                type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim()}
                className="text-sm px-4 py-2 border border-line rounded-sm disabled:opacity-50"
              >
                {checkingCoupon ? "Checking…" : "Apply"}
              </button>
            </div>
            {couponStatus?.error && <p className="text-xs text-chili mt-1">{couponStatus.error}</p>}
            {couponStatus?.discountAmount > 0 && (
              <p className="text-xs text-basil mt-1">✓ ₹{couponStatus.discountAmount.toFixed(0)} discount applied</p>
            )}
          </div>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-2">Payment method</label>
          <div className="flex gap-2 mb-4">
            <button
              type="button" onClick={() => setPaymentMethod("ONLINE")}
              className={`flex-1 text-sm py-2 rounded-sm border ${paymentMethod === "ONLINE" ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink"}`}
            >
              Pay online
            </button>
            <button
              type="button" onClick={() => setPaymentMethod("COD")}
              disabled={settings && !settings.codEnabled}
              className={`flex-1 text-sm py-2 rounded-sm border disabled:opacity-40 ${paymentMethod === "COD" ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink"}`}
            >
              Cash on delivery
            </button>
          </div>

          <div className="bg-paper rounded-sm p-4 mb-4 space-y-1">
            {needsStaff && (
              <div className="flex justify-between text-sm text-ink/70">
                <span>{staffCount} staff</span>
                <span>₹{staffCost.toFixed(0)}</span>
              </div>
            )}
            {Object.entries(selectedAddons).map(([addonId, qty]) => {
              const addon = allAddons.find((a) => a.id === addonId);
              if (!addon) return null;
              return (
                <div key={addonId} className="flex justify-between text-sm text-ink/70">
                  <span>{qty}× {addon.name}</span>
                  <span>₹{(addon.price * qty).toFixed(0)}</span>
                </div>
              );
            })}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-basil">
                <span>Discount</span>
                <span>−₹{discount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-ink pt-2 border-t border-line mt-2">
              <span>Total</span>
              <span>₹{finalTotal.toFixed(0)}</span>
            </div>
          </div>

          {belowMinimum && (
            <p className="text-xs text-chili mb-3">
              Minimum order amount is ₹{settings.minOrderAmount}. Add ₹{(settings.minOrderAmount - finalTotal).toFixed(0)} more (staff/add-ons) to continue.
            </p>
          )}

          <button
            type="submit" disabled={submitting || belowMinimum}
            className="btn-primary w-full py-3"
          >
            {submitting ? "Processing…" : paymentMethod === "COD" ? "Confirm booking (Cash on delivery)" : "Pay & confirm booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
