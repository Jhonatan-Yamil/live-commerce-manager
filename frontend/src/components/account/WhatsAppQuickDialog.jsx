import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import { QRCodeSVG } from "qrcode.react";
import { whatsappIntegrationApi } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { APP_PALETTE } from "../../theme/palette";

const statusConfig = {
  open: { label: "Conectado", color: "success" },
  opening: { label: "Conectando", color: "warning" },
  connecting: { label: "Conectando", color: "warning" },
  close: { label: "Sin conexion", color: "error" },
  closed: { label: "Sin conexion", color: "error" },
  default: { label: "Sin estado", color: "default" },
};

function formatDateTime(value) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return date.toLocaleString("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function WhatsAppQuickDialog({ open, onClose, user, updateUser }) {
  const { notifyError, notifyInfo, notifySuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [qrCode, setQrCode] = useState("");

  const currentStatus = statusData?.status || user?.whatsapp_instance_status || "close";
  const statusMeta = statusConfig[currentStatus] || statusConfig.default;
  const intakeEnabled = statusData?.intake_enabled ?? user?.whatsapp_intake_enabled ?? true;
  const connectedAt = statusData?.connected_at || user?.whatsapp_connected_at;
  const canDisconnect = useMemo(() => ["open", "opening", "connecting"].includes(currentStatus), [currentStatus]);

  const syncState = (data) => {
    setStatusData(data);
    if (data?.user) updateUser({ ...user, ...data.user });
    if (data?.qrcode) setQrCode(data.qrcode);
  };

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadStatus = async () => {
      setLoading(true);
      try {
        const res = await whatsappIntegrationApi.status();
        if (!active) return;
        syncState(res.data);
      } catch {
        if (active) notifyError("No se pudo cargar el estado de WhatsApp");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStatus();
    return () => {
      active = false;
    };
  }, [open]);

  const handleConnect = async () => {
    setSaving(true);
    try {
      const res = await whatsappIntegrationApi.connect();
      syncState(res.data);
      notifySuccess("WhatsApp actualizado");
      if (res.data?.qrcode) notifyInfo("Escanea el QR para completar la conexion");
    } catch {
      notifyError("No se pudo conectar WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      const res = await whatsappIntegrationApi.disconnect();
      syncState(res.data);
      setQrCode("");
      notifySuccess("WhatsApp desconectado");
    } catch {
      notifyError("No se pudo cerrar la sesion de WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIntake = async (event) => {
    const nextValue = event.target.checked;
    setSaving(true);
    try {
      const res = await whatsappIntegrationApi.setIntakeEnabled(nextValue);
      syncState(res.data);
      notifySuccess(nextValue ? "Recepcion activada" : "Recepcion pausada");
    } catch {
      notifyError("No se pudo actualizar la recepcion de comprobantes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900, color: APP_PALETTE.text.primary }}>
        WhatsApp de tu tienda
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color={APP_PALETTE.text.secondary}>
              Estado actual
            </Typography>
            <Chip
              label={statusMeta.label}
              color={statusMeta.color}
              variant={statusMeta.color === "default" ? "outlined" : "filled"}
            />
          </Stack>

          <Typography variant="body2" color={APP_PALETTE.text.secondary}>
            Conectado desde: {formatDateTime(connectedAt)}
          </Typography>

          <Alert severity={intakeEnabled ? "success" : "warning"}>
            {intakeEnabled ? "Recepcion de comprobantes activada." : "Recepcion de comprobantes pausada."}
          </Alert>

          <FormControlLabel
            control={<Switch checked={Boolean(intakeEnabled)} onChange={handleToggleIntake} disabled={saving || loading} />}
            label={intakeEnabled ? "Recibir comprobantes" : "Pausar comprobantes"}
          />

          {qrCode ? (
            <Box
              sx={{
                border: `1px solid ${APP_PALETTE.surfaces.border}`,
                borderRadius: 2,
                p: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: APP_PALETTE.surface,
              }}
            >
              <QRCodeSVG value={qrCode} size={210} level="M" />
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: APP_PALETTE.text.secondary }}>
              <QrCode2RoundedIcon fontSize="small" />
              <Typography variant="body2">Si conectas una sesion nueva, aqui aparecera el QR.</Typography>
            </Box>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Button
              variant="contained"
              startIcon={<LinkRoundedIcon />}
              onClick={handleConnect}
              disabled={saving || loading}
              sx={{ borderRadius: 999, fontWeight: 800 }}
            >
              Conectar WhatsApp
            </Button>
            <Button
              variant="outlined"
              startIcon={<LinkOffRoundedIcon />}
              onClick={handleDisconnect}
              disabled={saving || loading || !canDisconnect}
              sx={{ borderRadius: 999, fontWeight: 800 }}
            >
              Cerrar sesion
            </Button>
            <Button variant="text" onClick={onClose} sx={{ borderRadius: 999, fontWeight: 700 }}>
              Cerrar
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
