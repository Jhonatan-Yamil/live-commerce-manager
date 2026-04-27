import { APP_PALETTE } from "../theme/palette";

export const ORDER_STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: APP_PALETTE.status.warning },
  payment_in_review: { label: "Pago en revisión", color: APP_PALETTE.status.info },
  payment_confirmed: { label: "Pago confirmado", color: APP_PALETTE.status.success },
  payment_rejected: { label: "Pago rechazado", color: APP_PALETTE.status.error },
  in_delivery: { label: "En entrega", color: APP_PALETTE.status.delivery },
  delivered: { label: "Entregado", color: APP_PALETTE.status.success },
  cancelled: { label: "Cancelado", color: APP_PALETTE.status.neutral },
};

export const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pendiente", color: APP_PALETTE.status.warning, next: ["in_review"] },
  in_review: { label: "En revisión", color: APP_PALETTE.status.info, next: ["confirmed", "rejected"] },
  confirmed: { label: "Confirmado", color: APP_PALETTE.status.success, next: [] },
  rejected: { label: "Rechazado", color: APP_PALETTE.status.error, next: ["in_review"] },
};

export const DELIVERY_TYPE_LABELS = {
  pickup: { label: "Retiro en tienda", icon: "🏪" },
  shipping: { label: "Envío a otra ciudad", icon: "🚚" },
  coordinated: { label: "Entrega coordinada", icon: "📍" },
};

export const DELIVERY_STATUS = {
  in_store: { label: "En tienda", color: APP_PALETTE.status.warning },
  sent: { label: "Enviado", color: APP_PALETTE.status.delivery },
  delivered: { label: "Entregado", color: APP_PALETTE.status.success },
  failed: { label: "Fallido", color: APP_PALETTE.status.error },
};