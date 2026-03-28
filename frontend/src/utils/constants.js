export const ORDER_STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: "#f59e0b" },
  payment_in_review: { label: "Pago en revisión", color: "#3b82f6" },
  payment_confirmed: { label: "Pago confirmado", color: "#10b981" },
  payment_rejected: { label: "Pago rechazado", color: "#ef4444" },
  in_delivery: { label: "En entrega", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#059669" },
  cancelled: { label: "Cancelado", color: "#6b7280" },
};

export const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "#f59e0b", next: ["in_review"] },
  in_review: { label: "En revisión", color: "#3b82f6", next: ["confirmed", "rejected"] },
  confirmed: { label: "Confirmado", color: "#10b981", next: [] },
  rejected: { label: "Rechazado", color: "#ef4444", next: ["in_review"] },
};

export const DELIVERY_TYPE_LABELS = {
  pickup: { label: "Retiro en tienda", icon: "🏪" },
  shipping: { label: "Envío a otra ciudad", icon: "🚚" },
  coordinated: { label: "Entrega coordinada", icon: "📍" },
};

export const DELIVERY_STATUS = {
  in_store: { label: "En tienda", color: "#f59e0b" },
  sent: { label: "Enviado", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#10b981" },
  failed: { label: "Fallido", color: "#ef4444" },
};