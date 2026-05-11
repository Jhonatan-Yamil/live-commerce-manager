import { APP_PALETTE } from "../../theme/palette";

export const STATUS_LABELS_NEXT = {
  in_review: "Marcar en revisión",
  confirmed: "Confirmar pago ✓",
  rejected: "Rechazar pago ✗",
};

export const NEXT_COLORS = {
  confirmed: {
    bg: APP_PALETTE.surfaces.successSoft,
    color: APP_PALETTE.status.success,
    hoverBg: "#d7e6df",
  },
  rejected: {
    bg: APP_PALETTE.surfaces.errorSoft,
    color: APP_PALETTE.status.error,
    hoverBg: "#edd9dd",
  },
  in_review: {
    bg: APP_PALETTE.surfaces.warningSoft,
    color: APP_PALETTE.status.warning,
    hoverBg: "#e7dfae",
  },
};
