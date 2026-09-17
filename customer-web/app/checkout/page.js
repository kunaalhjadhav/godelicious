"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import LocationPickerMap from "@/components/LocationPickerMap";
import { MapPin, CheckCircle2, Map as MapIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { APP_NAME } from "@/lib/brand";

const MIN_LEAD_HOURS = 15;

// Half-hour delivery slots, 8:00 AM – 9:00 PM
function buildTimeSlots() {
  const slots = [];
  for (let mins = 8 * 60; mins <= 21 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${h12}:${m === 0 ? "00" : m} ${period}`);
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

// Combines a yyyy-mm-dd date string with a "H:MM AM/PM" slot into one Date,
// for the client-side lead-time check (backend re-validates this too).
function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const date = new Date(dateStr);
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return date;
  let [, h, m, period] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period.toUpperCase() === "AM" && h === 12) h = 0;
  date.setHours(h, m, 0, 0);
  return date;
}

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [coords, setCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [settings, setSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items, router]);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  // Reverse-geocodes lat/lng into a human-readable address via Google's
  // Geocoding API. Needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set — without it,
  // this silently no-ops and the address field is left for manual entry.
  // Loads the Google Maps JS API once, so we can use its client-side Geocoder
  // class. A raw fetch() straight to the Geocoding REST endpoint from the
  // browser frequently gets CORS-blocked — the Geocoder class is the
  // supported way to do this from client-side JS.
  function loadGoogleMaps() {
    if (window.google?.maps) return Promise.resolve();
    if (window.__gmapsLoadingPromise) return window.__gmapsLoadingPromise;
    window.__gmapsLoadingPromise = new Promise((resolve, reject) => {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!key) { reject(new Error("Google Maps API key is not configured")); return; }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Google Maps script failed to load — check your API key and that Maps JavaScript API is enabled"));
      document.head.appendChild(script);
    });
    return window.__gmapsLoadingPromise;
  }

  async function reverseGeocode(lat, lng) {
    try {
      await loadGoogleMaps();
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      const address = result.results?.[0]?.formatted_address || null;
      if (!address) return { address: null, error: "No address found for this location." };
      return { address, error: null };
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      return { address: null, error: err.message || "Reverse geocoding failed." };
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        const { address: addr, error: geoErr } = await reverseGeocode(latitude, longitude);
        if (addr) {
          setAddress(addr);
        } else {
          setError(`Location captured, but couldn't fill in the address automatically (${geoErr}). Please type it manually, or use "Pick on map".`);
        }
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — check browser permissions, or enter your address manually.");
        setLocating(false);
      }
    );
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const data = await api.validateCoupon(couponCode.trim(), totalAmount);
      setCouponStatus({ discountAmount: data.discountAmount });
    } catch (err) {
      setCouponStatus({ error: err.message });
    } finally {
      setCheckingCoupon(false);
    }
  }

  const discount = couponStatus?.discountAmount || 0;
  const finalTotal = Math.max(0, totalAmount - discount);
  // Informational breakdown only — does not change the amount actually
  // charged. If you want GST added as a genuine extra charge on top of
  // prices, that needs a backend pricing change too — check with your
  // accountant on GST registration/compliance before doing that.
  const GST_RATE = 0.05;
  const gstAmount = finalTotal - finalTotal / (1 + GST_RATE);
  const belowMinimum = settings && finalTotal < settings.minOrderAmount && finalTotal > 0;
  const dateTimeInvalid = !eventDate || !eventTime || combineDateTime(eventDate, eventTime) < new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!eventDate || !eventTime) {
      setError("Please select a delivery date and time.");
      return;
    }
    const chosen = combineDateTime(eventDate, eventTime);
    const minAllowed = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
    if (chosen < minAllowed) {
      setError(`Orders must be placed at least ${MIN_LEAD_HOURS} hours before the selected delivery time.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: items.map((line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          selectedOptions: line.selectedOptions,
        })),
        deliveryAddress: address,
        contactPhone: phone,
        notes,
        eventDate,
        eventTime,
        guestCount: guestCount || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        couponCode: couponStatus?.discountAmount ? couponCode.trim() : undefined,
        paymentMethod,
      };
      const { order } = await api.createOrder(payload);

      if (paymentMethod === "COD") {
        clearCart();
        router.push(`/orders/${order.id}`);
        return;
      }

      // ONLINE — open Razorpay checkout
      if (!razorpayReady || !window.Razorpay) {
        throw new Error("Payment gateway is still loading — please try again in a moment.");
      }
      const rp = await api.createRazorpayOrder(order.id);

      const razorpay = new window.Razorpay({
        key: rp.keyId,
        amount: rp.amount,
        currency: rp.currency,
        order_id: rp.razorpayOrderId,
        name: APP_NAME,
        description: `Order #${order.id.slice(0, 8)}`,
        prefill: { name: user.name, email: user.email, contact: phone },
        theme: { color: "#1C1B19" },
        handler: async (response) => {
          try {
            await api.verifyRazorpayPayment({
              orderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            router.push(`/orders/${order.id}`);
          } catch (err) {
            setError(`Payment succeeded but verification failed: ${err.message}. Contact support with order #${order.id.slice(0, 8)}.`);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError("Payment was cancelled. Your order is saved but unpaid — you can retry from My Orders.");
          },
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading || !user || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayReady(true)} />
      <Nav />
      <div className="max-w-xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-6">Checkout</h1>

        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-6 mb-6">
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Delivery address</label>
          <textarea
            required value={address} onChange={(e) => setAddress(e.target.value)} rows={3}
            placeholder="Flat / street / area / city"
            className="field-input mb-2"
          />
          <button
            type="button" onClick={useMyLocation} disabled={locating}
            className="inline-flex items-center gap-1 text-xs text-saffron2 hover:underline mb-3 disabled:opacity-50 mr-4"
          >
            {locating ? (
              "Getting location…"
            ) : coords ? (
              <><CheckCircle2 size={13} /> Location captured</>
            ) : (
              <><MapPin size={13} /> Use my current location</>
            )}
          </button>
          <button
            type="button" onClick={() => setShowMap((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-saffron2 hover:underline mb-3"
          >
            <MapIcon size={13} /> {showMap ? "Hide map" : "Pick on map"}
          </button>
          {showMap && (
            <LocationPickerMap
              initialLat={coords?.latitude} initialLng={coords?.longitude}
              onLocationSelected={({ latitude, longitude, address: mapAddress }) => {
                setCoords({ latitude, longitude });
                if (mapAddress) setAddress(mapAddress);
              }}
            />
          )}

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Contact phone</label>
          <input
            required value={phone} onChange={(e) => setPhone(e.target.value)}
            className="field-input mb-3"
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Delivery date
              </label>
              <input
                type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Guest count (optional)
              </label>
              <input
                type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)}
                placeholder="e.g. 20"
                className="field-input"
              />
            </div>
          </div>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Delivery time</label>
          <select
            required value={eventTime} onChange={(e) => setEventTime(e.target.value)}
            className="field-input mb-2"
          >
            <option value="">Select a time</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
          {eventDate && eventTime && (() => {
            const chosen = combineDateTime(eventDate, eventTime);
            const minAllowed = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
            if (chosen < minAllowed) {
              return (
                <p className="text-xs text-chili mb-3">
                  Orders must be placed at least {MIN_LEAD_HOURS} hours before the selected delivery time — please pick a later slot.
                </p>
              );
            }
            return <p className="text-xs text-basil mb-3">Delivered {new Date(chosen).toLocaleString()}</p>;
          })()}

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Notes (optional)</label>
          <input
            value={notes} onChange={(e) => setNotes(e.target.value)}
            className="field-input mb-4"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Coupon code</label>
          <div className="flex gap-2 mb-1">
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
          {couponStatus?.error && <p className="text-xs text-chili mb-3">{couponStatus.error}</p>}
          {couponStatus?.discountAmount > 0 && (
            <p className="text-xs text-basil mb-3">✓ ₹{couponStatus.discountAmount.toFixed(0)} discount applied</p>
          )}

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-2 mt-3">Payment method</label>
          <div className="flex gap-2 mb-3">
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
          {settings && !settings.codEnabled && (
            <p className="text-xs text-ink/40 mb-3">Cash on delivery isn't available right now.</p>
          )}

          <div className="border-t border-line mt-2 pt-4 space-y-1">
            {items.map((line) => (
              <div key={line.key} className="flex justify-between text-sm text-ink/70">
                <span>{line.menuItem.soldByWeight ? `${line.quantity}g` : `${line.quantity}×`} {line.menuItem.name}</span>
                <span>₹{(line.unitPrice * line.quantity).toFixed(0)}</span>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-basil">
                <span>Discount</span>
                <span>−₹{discount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-ink/70">
              <span>GST (5%, included)</span>
              <span>₹{gstAmount.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm text-basil">
              <span>Delivery</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between font-semibold text-ink pt-2">
              <span>Total</span>
              <span>₹{finalTotal.toFixed(0)}</span>
            </div>
          </div>

          {belowMinimum && (
            <p className="text-xs text-chili mt-3">
              Minimum order amount is ₹{settings.minOrderAmount}. Add ₹{(settings.minOrderAmount - finalTotal).toFixed(0)} more to checkout.
            </p>
          )}

          <button
            type="submit" disabled={submitting || belowMinimum || dateTimeInvalid}
            className="btn-primary w-full mt-5 py-3"
          >
            {submitting ? "Processing…" : paymentMethod === "COD" ? "Place order (Cash on delivery)" : "Pay & place order"}
          </button>
        </form>
      </div>
    </div>
  );
}
