const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export { API_URL };
const TOKEN_KEY = "godelicious_web_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// Same shape as the React Native app's client (src/api/client.js) — this is
// intentional: both clients speak to the exact same backend endpoints, so
// an order or enquiry placed on web shows up identically for staff/admin,
// and vice versa.
export const api = {
  register: (name, email, password, phone) =>
    request("/api/auth/register", { method: "POST", body: { name, email, password, phone } }),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/api/auth/me"),

  listCategories: () => request("/api/menu/categories"),
  listMenu: (categoryId) =>
    request(`/api/menu?available=true${categoryId ? `&categoryId=${categoryId}` : ""}`),

  createOrder: (payload) => request("/api/orders", { method: "POST", body: payload }),
  myOrders: () => request("/api/orders/my"),
  getOrder: (id) => request(`/api/orders/${id}`),

  createEnquiry: (payload) => request("/api/venue-enquiries", { method: "POST", body: payload }),
  myEnquiries: () => request("/api/venue-enquiries/my"),

  listBanners: () => request("/api/banners"),

  validateCoupon: (code, subtotal) =>
    request("/api/coupons/validate", { method: "POST", body: { code, subtotal } }),

  myNotifications: () => request("/api/notifications/my"),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: "POST" }),

  myMessages: () => request("/api/chat/my"),
  sendMessage: (body) => request("/api/chat/my", { method: "POST", body: { body } }),

  // OTP login
  requestOtp: (phone) => request("/api/auth/otp/request", { method: "POST", body: { phone } }),
  verifyOtp: (phone, code, name) =>
    request("/api/auth/otp/verify", { method: "POST", body: { phone, code, name } }),

  // Settings (min order, COD availability)
  getSettings: () => request("/api/settings"),

  // Razorpay
  createRazorpayOrder: (orderId) =>
    request("/api/payments/razorpay/create-order", { method: "POST", body: { orderId } }),
  verifyRazorpayPayment: (payload) =>
    request("/api/payments/razorpay/verify", { method: "POST", body: payload }),

  // Reviews
  createReview: (orderId, rating, comment) =>
    request("/api/reviews", { method: "POST", body: { orderId, rating, comment } }),

  // Order types (the 3 home-page package cards) and add-ons for booking
  listOrderTypes: () => request("/api/order-types"),
  listAddons: () => request("/api/addons"),

  // Brand partner browsing
  listBrandsPublic: () => request("/api/brands/public"),
  listMenuByBrand: (brandId) => request(`/api/menu?available=true&brandId=${brandId}`),
};
