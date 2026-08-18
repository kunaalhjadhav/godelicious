import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Geolocation from "@react-native-community/geolocation";
import RazorpayCheckout from "react-native-razorpay";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors, spacing } from "../theme";
import { APP_NAME } from "../brand";

export default function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [guestCount, setGuestCount] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [settings, setSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const discount = couponStatus?.discountAmount || 0;
  const finalTotal = Math.max(0, totalAmount - discount);
  const belowMinimum = settings && finalTotal < settings.minOrderAmount && finalTotal > 0;

  function useMyLocation() {
    setLocating(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        Alert.alert("Couldn't get location", "Check that location permission is granted, or enter your address manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
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

  async function placeOrder() {
    if (!address || !phone) {
      Alert.alert("Missing info", "Delivery address and phone number are required.");
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
        eventDate: eventDate ? eventDate.toISOString() : undefined,
        guestCount: guestCount || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        couponCode: couponStatus?.discountAmount ? couponCode.trim() : undefined,
        paymentMethod,
      };
      const { order } = await api.createOrder(payload);

      if (paymentMethod === "COD") {
        clearCart();
        Alert.alert("Order placed!", "Pay in cash when your order arrives.", [
          { text: "Track order", onPress: () => navigation.replace("OrderDetail", { orderId: order.id }) },
        ]);
        return;
      }

      // ONLINE — open Razorpay's native checkout
      const rp = await api.createRazorpayOrder(order.id);
      const rpResult = await RazorpayCheckout.open({
        key: rp.keyId,
        amount: rp.amount,
        currency: rp.currency,
        order_id: rp.razorpayOrderId,
        name: APP_NAME,
        description: `Order #${order.id.slice(0, 8)}`,
        prefill: { name: user.name, email: user.email, contact: phone },
        theme: { color: "#1C1B19" },
      });

      await api.verifyRazorpayPayment({
        orderId: order.id,
        razorpayPaymentId: rpResult.razorpay_payment_id,
        razorpaySignature: rpResult.razorpay_signature,
      });
      clearCart();
      Alert.alert("Order placed!", `Payment confirmed. Total: ₹${order.totalAmount.toFixed(0)}`, [
        { text: "Track order", onPress: () => navigation.replace("OrderDetail", { orderId: order.id }) },
      ]);
    } catch (err) {
      // RazorpayCheckout.open() rejects with { code, description } on cancel/failure,
      // rather than a plain Error — handle both shapes.
      const message = err?.description || err?.message || "Something went wrong.";
      Alert.alert("Couldn't complete order", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <Text style={styles.label}>Delivery address</Text>
      <TextInput
        style={[styles.input, { height: 70 }]} value={address} onChangeText={setAddress}
        multiline placeholder="Flat / street / area / city"
      />
      <TouchableOpacity onPress={useMyLocation} disabled={locating}>
        <Text style={styles.locationLink}>
          {locating ? "Getting location…" : coords ? "✓ Location captured" : "📍 Use my current location"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Contact phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={styles.label}>Event date (optional)</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text>{eventDate ? eventDate.toLocaleDateString() : "Select date"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Guest count</Text>
          <TextInput
            style={styles.input} value={guestCount} onChangeText={setGuestCount}
            keyboardType="number-pad" placeholder="e.g. 20"
          />
        </View>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={eventDate || new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selected) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selected) setEventDate(selected);
          }}
        />
      )}

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Any special instructions" />

      <Text style={styles.label}>Coupon code</Text>
      <View style={styles.couponRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
          value={couponCode}
          onChangeText={(t) => { setCouponCode(t.toUpperCase()); setCouponStatus(null); }}
          placeholder="e.g. WELCOME10"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon} disabled={checkingCoupon || !couponCode.trim()}>
          <Text style={styles.applyBtnText}>{checkingCoupon ? "…" : "Apply"}</Text>
        </TouchableOpacity>
      </View>
      {couponStatus?.error && <Text style={styles.couponError}>{couponStatus.error}</Text>}
      {couponStatus?.discountAmount > 0 && (
        <Text style={styles.couponSuccess}>✓ ₹{couponStatus.discountAmount.toFixed(0)} discount applied</Text>
      )}

      <Text style={styles.label}>Payment method</Text>
      <View style={styles.paymentRow}>
        <TouchableOpacity
          onPress={() => setPaymentMethod("ONLINE")}
          style={[styles.paymentBtn, paymentMethod === "ONLINE" && styles.paymentBtnActive]}
        >
          <Text style={[styles.paymentBtnText, paymentMethod === "ONLINE" && styles.paymentBtnTextActive]}>Pay online</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPaymentMethod("COD")}
          disabled={settings && !settings.codEnabled}
          style={[styles.paymentBtn, paymentMethod === "COD" && styles.paymentBtnActive, settings && !settings.codEnabled && { opacity: 0.4 }]}
        >
          <Text style={[styles.paymentBtnText, paymentMethod === "COD" && styles.paymentBtnTextActive]}>Cash on delivery</Text>
        </TouchableOpacity>
      </View>
      {settings && !settings.codEnabled && (
        <Text style={styles.hint}>Cash on delivery isn't available right now.</Text>
      )}

      <View style={styles.summary}>
        {items.map((line) => (
          <View key={line.key} style={styles.summaryRow}>
            <Text style={styles.summaryItem}>{line.quantity}× {line.menuItem.name}</Text>
            <Text style={styles.summaryPrice}>₹{(line.unitPrice * line.quantity).toFixed(0)}</Text>
          </View>
        ))}
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryItem, { color: colors.basil }]}>Discount</Text>
            <Text style={[styles.summaryPrice, { color: colors.basil }]}>−₹{discount.toFixed(0)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.sm }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toFixed(0)}</Text>
        </View>
      </View>

      {belowMinimum && (
        <Text style={styles.minOrderWarning}>
          Minimum order amount is ₹{settings.minOrderAmount}. Add ₹{(settings.minOrderAmount - finalTotal).toFixed(0)} more to checkout.
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={placeOrder} disabled={submitting || belowMinimum}>
        <Text style={styles.buttonText}>
          {submitting ? "Processing…" : paymentMethod === "COD" ? "Place order (Cash on delivery)" : "Pay & place order"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.paper, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.inkFaint, marginBottom: 4, marginTop: spacing.sm, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 10, backgroundColor: colors.white, fontSize: 15, justifyContent: "center" },
  locationLink: { color: colors.saffron2, fontSize: 13, marginTop: 6 },
  row: { flexDirection: "row" },
  couponRow: { flexDirection: "row", alignItems: "center" },
  applyBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  applyBtnText: { fontSize: 13, color: colors.ink },
  couponError: { color: colors.chili, fontSize: 12, marginTop: 4 },
  couponSuccess: { color: colors.basil, fontSize: 12, marginTop: 4 },
  paymentRow: { flexDirection: "row" },
  paymentBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingVertical: 10, alignItems: "center", marginRight: spacing.sm },
  paymentBtnActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  paymentBtnText: { fontSize: 13, color: colors.ink },
  paymentBtnTextActive: { color: colors.paper },
  hint: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
  summary: { backgroundColor: colors.white, borderRadius: 6, padding: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.line },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryItem: { fontSize: 14, color: colors.ink },
  summaryPrice: { fontSize: 14, color: colors.ink },
  totalLabel: { fontSize: 15, fontWeight: "700", color: colors.ink },
  totalValue: { fontSize: 15, fontWeight: "700", color: colors.ink },
  minOrderWarning: { color: colors.chili, fontSize: 12, marginTop: spacing.sm },
  button: { backgroundColor: colors.charcoal, borderRadius: 4, padding: 14, alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  buttonText: { color: colors.paper, fontWeight: "600", fontSize: 15 },
});
