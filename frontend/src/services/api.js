import axios from "axios";

const rawApiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
const api = axios.create({ baseURL: rawApiBaseUrl });

export const getBackendOrigin = () => {
  if (rawApiBaseUrl.startsWith("/")) {
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:8000";
  }

  try {
    return new URL(rawApiBaseUrl).origin;
  } catch {
    return "http://localhost:8000";
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  login: (data) => api.post("/auth/login", data),
};

export const clientsApi = {
  list: () => api.get("/clients"),
  create: (d) => api.post("/clients", d),
  update: (id, d) => api.put(`/clients/${id}`, d),
  get: (id) => api.get(`/clients/${id}`),
};

export const productsApi = {
  list: () => api.get("/products"),
  create: (d) => api.post("/products", d),
  update: (id, d) => api.put(`/products/${id}`, d),
  sold: () => api.get("/products/sold"),
  names: () => api.get("/products/names"),
};

export const ordersApi = {
  list: () => api.get("/orders"),
  create: (d) => api.post("/orders", d),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

export const paymentsApi = {
  list: () => api.get("/payments"),
  updateStatus: (id, data) => api.patch(`/payments/${id}/status`, data),
  uploadVoucher: (orderId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/payments/order/${orderId}/voucher`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const logisticsApi = {
  list: () => api.get("/logistics"),
  create: (d) => api.post("/logistics", d),
  update: (id, d) => api.put(`/logistics/${id}`, d),
};

export const lotsApi = {
  list: () => api.get("/lots"),
  create: (d) => api.post("/lots", d),
  update: (id, d) => api.put(`/lots/${id}`, d),
};

export const intakeApi = {
  listSuggestions: (status) => api.get("/intake/suggestions", { params: status ? { status } : {} }),
  confirm: (id) => api.post(`/intake/vouchers/${id}/confirm`),
  reject: (id) => api.post(`/intake/vouchers/${id}/reject`),
  reassign: (id, orderId) => api.post(`/intake/vouchers/${id}/reassign`, { order_id: Number(orderId) }),
  reprocess: (id) => api.post(`/intake/vouchers/${id}/reprocess`),
};