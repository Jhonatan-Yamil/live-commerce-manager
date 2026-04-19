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

const createCrudApi = (basePath, options = {}) => {
  const crudApi = {
    list: () => api.get(basePath),
    create: (data) => api.post(basePath, data),
    update: (id, data) => api.put(`${basePath}/${id}`, data),
  };

  if (options.includeGet) {
    crudApi.get = (id) => api.get(`${basePath}/${id}`);
  }

  return crudApi;
};

export const authApi = {
  login: (data) => api.post("/auth/login", data),
};

export const clientsApi = createCrudApi("/clients", { includeGet: true });

export const productsApi = {
  ...createCrudApi("/products"),
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

export const logisticsApi = createCrudApi("/logistics");

export const lotsApi = createCrudApi("/lots");

export const intakeApi = {
  listSuggestions: (status) => api.get("/intake/suggestions", { params: status ? { status } : {} }),
  confirm: (id) => api.post(`/intake/vouchers/${id}/confirm`),
  reject: (id) => api.post(`/intake/vouchers/${id}/reject`),
  reassign: (id, orderId) => api.post(`/intake/vouchers/${id}/reassign`, { order_id: Number(orderId) }),
  reprocess: (id) => api.post(`/intake/vouchers/${id}/reprocess`),
};