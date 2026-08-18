"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { APP_NAME } from "@/lib/brand";

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [coords, setCoords] = useState(null);
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
  const belowMinimum = settings && finalTotal < settings.minOrderAmount && finalTotal > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
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
        eventDate: eventDate || undefined,
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
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button
            type="button" onClick={useMyLocation} disabled={locating}
            className="text-xs text-saffron2 hover:underline mb-3 disabled:opacity-50"
          >
            {locating ? "Getting location…" : coords ? "✓ Location captured" : "📍 Use my current location"}
          </button>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Contact phone</label>
          <input
            required value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Event date (optional)
              </label>
              <input
                type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-sm text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Guest count (optional)
              </label>
              <input
                type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)}
                placeholder="e.g. 20"
                className="w-full px-3 py-2 border border-line rounded-sm text-sm"
              />
            </div>
          </div>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Notes (optional)</label>
          <input
            value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Coupon code</label>
          <div className="flex gap-2 mb-1">
            <input
              value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
              placeholder="e.g. WELCOME10"
              className="flex-1 px-3 py-2 border border-line rounded-sm text-sm font-mono"
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
                <span>{line.quantity}× {line.menuItem.name}</span>
                <span>₹{(line.unitPrice * line.quantity).toFixed(0)}</span>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-basil">
                <span>Discount</span>
                <span>−₹{discount.toFixed(0)}</span>
              </div>
            )}
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
            type="submit" disabled={submitting || belowMinimum}
            className="w-full mt-5 bg-charcoal text-paper py-3 rounded-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Processing…" : paymentMethod === "COD" ? "Place order (Cash on delivery)" : "Pay & place order"}
          </button>
        </form>
      </div>
    </div>
  );
}
