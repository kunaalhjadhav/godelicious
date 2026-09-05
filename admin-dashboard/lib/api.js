const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export { API_URL };

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("godelicious_admin_token");
}
export function setToken(token) {
  localStorage.setItem("godelicious_admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("godelicious_admin_token");
}

// Central fetch wrapper: attaches auth token, parses JSON, throws readable errors.
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

export const api = {
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/api/auth/me"),

  dashboardStats: () => request("/api/dashboard/stats"),

  listOrders: (status) => request(`/api/orders${status ? `?status=${status}` : ""}`),
  updateOrderStatus: (id, status) =>
    request(`/api/orders/${id}/status`, { method: "PATCH", body: { status } }),

  listMenu: () => request("/api/menu"),
  listCategories: () => request("/api/menu/categories"),
  createMenuItem: (item) => request("/api/menu", { method: "POST", body: item }),
  updateMenuItem: (id, item) => request(`/api/menu/${id}`, { method: "PUT", body: item }),
  deleteMenuItem: (id) => request(`/api/menu/${id}`, { method: "DELETE" }),
  createCategory: (name) => request("/api/menu/categories", { method: "POST", body: { name } }),

  // Multipart upload — bypasses the JSON request() wrapper since it needs
  // FormData with no Content-Type header (the browser sets the boundary itself).
  uploadImage: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Image upload failed.");
    return data; // { url: "/uploads/..." }
  },

  listInventory: () => request("/api/inventory"),
  adjustStock: (menuItemId, changeQty, reason) =>
    request(`/api/inventory/${menuItemId}`, { method: "PATCH", body: { changeQty, reason } }),

  listEnquiries: (status) => request(`/api/venue-enquiries${status ? `?status=${status}` : ""}`),
  reviewEnquiry: (id, status, adminNote) =>
    request(`/api/venue-enquiries/${id}`, { method: "PATCH", body: { status, adminNote } }),

  // Coupons
  listCoupons: () => request("/api/coupons"),
  createCoupon: (payload) => request("/api/coupons", { method: "POST", body: payload }),
  updateCoupon: (id, payload) => request(`/api/coupons/${id}`, { method: "PATCH", body: payload }),
  deleteCoupon: (id) => request(`/api/coupons/${id}`, { method: "DELETE" }),

  // Chat
  listChatThreads: () => request("/api/chat/threads"),
  getChatThread: (customerId) => request(`/api/chat/threads/${customerId}`),
  replyToThread: (customerId, body) =>
    request(`/api/chat/threads/${customerId}`, { method: "POST", body: { body } }),

  // Banners
  listAllBanners: () => request("/api/banners/all"),
  createBanner: (payload) => request("/api/banners", { method: "POST", body: payload }),
  updateBanner: (id, payload) => request(`/api/banners/${id}`, { method: "PATCH", body: payload }),
  deleteBanner: (id) => request(`/api/banners/${id}`, { method: "DELETE" }),

  // Notifications (broadcast)
  listNotifications: () => request("/api/notifications"),
  createNotification: (title, body) =>
    request("/api/notifications", { method: "POST", body: { title, body } }),

  // Combo groups
  addComboGroup: (menuItemId, payload) =>
    request(`/api/menu/${menuItemId}/combo-groups`, { method: "POST", body: payload }),
  deleteComboGroup: (groupId) => request(`/api/menu/combo-groups/${groupId}`, { method: "DELETE" }),

  // Bulk menu upload
  bulkUploadMenu: (items) => request("/api/menu/bulk", { method: "POST", body: { items } }),

  // Sales reports
  salesReport: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request(`/api/reports/sales${params.toString() ? `?${params}` : ""}`);
  },
  exportSalesCsvUrl: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `${API_URL}/api/reports/sales/export${params.toString() ? `?${params}` : ""}`;
  },

  // Brands
  listBrands: () => request("/api/brands"),
  createBrand: (payload) => request("/api/brands", { method: "POST", body: payload }),
  updateBrand: (id, payload) => request(`/api/brands/${id}`, { method: "PATCH", body: payload }),
  deleteBrand: (id) => request(`/api/brands/${id}`, { method: "DELETE" }),
  brandSales: (id, from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request(`/api/brands/${id}/sales${params.toString() ? `?${params}` : ""}`);
  },
  createSettlement: (id, periodStart, periodEnd) =>
    request(`/api/brands/${id}/settlements`, { method: "POST", body: { periodStart, periodEnd } }),
  listSettlements: (id) => request(`/api/brands/${id}/settlements`),
  markSettlementPaid: (settlementId) =>
    request(`/api/brands/settlements/${settlementId}`, { method: "PATCH" }),

  // Settings
  getSettings: () => request("/api/settings"),
  updateSettings: (payload) => request("/api/settings", { method: "PATCH", body: payload }),

  // Reviews
  listReviews: () => request("/api/reviews"),

  // COD confirmation
  confirmCod: (orderId) => request(`/api/orders/${orderId}/confirm-cod`, { method: "PATCH" }),

  // Order types (the 3 home-page package categories)
  listAllOrderTypes: () => request("/api/order-types/all"),
  createOrderType: (payload) => request("/api/order-types", { method: "POST", body: payload }),
  updateOrderType: (id, payload) => request(`/api/order-types/${id}`, { method: "PATCH", body: payload }),
  deleteOrderType: (id) => request(`/api/order-types/${id}`, { method: "DELETE" }),

  // Add-ons
  listAllAddons: () => request("/api/addons/all"),
  createAddon: (payload) => request("/api/addons", { method: "POST", body: payload }),
  updateAddon: (id, payload) => request(`/api/addons/${id}`, { method: "PATCH", body: payload }),
  deleteAddon: (id) => request(`/api/addons/${id}`, { method: "DELETE" }),

  // Brand partner self-service portal
  registerBrandPartner: (payload) => request("/api/brand-partners/register", { method: "POST", body: payload }),
  myBrandDashboard: () => request("/api/brand-partners/me/dashboard"),
  myBrandOrders: () => request("/api/brand-partners/me/orders"),
  myBrandMenu: () => request("/api/brand-partners/me/menu"),
  createMyBrandMenuItem: (payload) => request("/api/brand-partners/me/menu", { method: "POST", body: payload }),
  updateMyBrandMenuItem: (id, payload) => request(`/api/brand-partners/me/menu/${id}`, { method: "PUT", body: payload }),
  deleteMyBrandMenuItem: (id) => request(`/api/brand-partners/me/menu/${id}`, { method: "DELETE" }),
  myBrandLocations: () => request("/api/brand-partners/me/locations"),
  createMyBrandLocation: (payload) => request("/api/brand-partners/me/locations", { method: "POST", body: payload }),
  deleteMyBrandLocation: (id) => request(`/api/brand-partners/me/locations/${id}`, { method: "DELETE" }),
  myBrandOffers: () => request("/api/brand-partners/me/offers"),
  createMyBrandOffer: (payload) => request("/api/brand-partners/me/offers", { method: "POST", body: payload }),
  myBrandEarnings: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request(`/api/brand-partners/me/earnings${params.toString() ? `?${params}` : ""}`);
  },

  // Offers (admin review)
  listAllOffers: (status) => request(`/api/offers/all${status ? `?status=${status}` : ""}`),
  reviewOffer: (id, status, adminNote) =>
    request(`/api/offers/${id}`, { method: "PATCH", body: { status, adminNote } }),
};
