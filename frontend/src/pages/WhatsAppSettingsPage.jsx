import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import PhoneAndroidRoundedIcon from "@mui/icons-material/PhoneAndroidRounded";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { whatsappIntegrationApi } from "../services/api";
import { APP_PALETTE } from "../theme/palette";

const statusConfig = {
  open: { label: "Conectado", color: "success" },
  opening: { label: "Conectando", color: "warning" },
  connecting: { label: "Conectando", color: "warning" },
  close: { label: "Desconectado", color: "default" },
  closed: { label: "Desconectado", color: "default" },
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

function normalizeQrCodeSource(qrcode) {
  if (!qrcode) return "";
  if (qrcode.startsWith("data:image")) return qrcode;
  if (qrcode.startsWith("http://") || qrcode.startsWith("https://")) return qrcode;
  if (qrcode.startsWith("2@") || qrcode.includes(",")) return null;
  return `data:image/png;base64,${qrcode}`;
}

export default function WhatsAppSettingsPage() {
  const { user, updateUser } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");

  const currentStatus = statusData?.status || user?.whatsapp_instance_status || "close";
  const statusMeta = statusConfig[currentStatus] || statusConfig.default;
  const instanceName = statusData?.instance_name || user?.whatsapp_instance_name || "Sin instancia";
  const intakeEnabled = statusData?.intake_enabled ?? user?.whatsapp_intake_enabled ?? true;
  const connectedAt = statusData?.connected_at || user?.whatsapp_connected_at;

  const canDisconnect = useMemo(() => ["open", "opening", "connecting"].includes(currentStatus), [currentStatus]);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const res = await whatsappIntegrationApi.status();
        if (!active) return;
        setStatusData(res.data);
        if (res.data.user) {
          updateUser(res.data.user);
        }
      } catch {
        if (active) {
          notifyInfo("No se pudo consultar el estado de WhatsApp");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStatus();

    return () => {
      active = false;
    };
  }, []);

  const syncState = (data) => {
    setStatusData(data);
    if (data?.user) {
      updateUser(data.user);
    }
    if (data?.qrcode) {
      setQrCode(data.qrcode);
      setQrOpen(true);
    }
  };

  const handleConnect = async () => {
    setSaving(true);
    try {
      const res = await whatsappIntegrationApi.connect();
      syncState(res.data);
      notifySuccess("Sesión de WhatsApp actualizada");
      if (res.data.qrcode) {
        notifyInfo("Escanea el código QR para completar la conexión");
      }
    } catch {
      notifyError("No se pudo conectar la sesión de WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      const res = await whatsappIntegrationApi.disconnect();
      syncState(res.data);
      setQrOpen(false);
      setQrCode("");
      notifySuccess("Sesión de WhatsApp desconectada");
    } catch {
      notifyError("No se pudo desconectar la sesión de WhatsApp");
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
      notifySuccess(nextValue ? "Intake de WhatsApp activado" : "Intake de WhatsApp desactivado");
    } catch {
      notifyError("No se pudo actualizar el intake de WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 4,
          background: `linear-gradient(135deg, ${APP_PALETTE.brand.primary} 0%, #12314e 100%)`,
          color: "#fffdf9",
          boxShadow: "0 18px 40px rgba(18, 38, 56, 0.18)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: "auto -40px -70px auto",
            width: 220,
            height: 220,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.08)",
            filter: "blur(4px)",
          }}
        />
        <Stack spacing={1.2} sx={{ position: "relative", zIndex: 1, maxWidth: 780 }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(255,255,255,0.12)",
              }}
            >
              <PhoneAndroidRoundedIcon />
            </Box>
            <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: 0.2 }}>
              WhatsApp por usuario
            </Typography>
          </Stack>
          <Typography sx={{ color: "rgba(255,255,255,0.86)", maxWidth: 760 }}>
            Cada vendedor tiene su propia instancia. Desde aquí puedes conectar, desconectar y decidir si los mensajes entrantes generan intake automático.
          </Typography>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: APP_PALETTE.brand.primary }} />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
              <Stack spacing={2.2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Box>
                    <Typography fontSize={18} fontWeight={900} color={APP_PALETTE.text.primary}>
                      Estado de la sesión
                    </Typography>
                    <Typography variant="body2" color={APP_PALETTE.text.secondary} mt={0.5}>
                      Revisa si la instancia está abierta y si el intake sigue activo.
                    </Typography>
                  </Box>
                  <Chip label={statusMeta.label} color={statusMeta.color} variant={statusMeta.color === "default" ? "outlined" : "filled"} />
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                      <CardContent>
                        <Typography variant="overline" color="text.secondary" fontWeight={800}>
                          Instancia
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                          {instanceName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          La instancia se asigna al usuario y se usa para enrutar el webhook.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                      <CardContent>
                        <Typography variant="overline" color="text.secondary" fontWeight={800}>
                          Conectado desde
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                          {formatDateTime(connectedAt)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Si no hay conexión activa, este valor queda vacío hasta que WhatsApp se autentica.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Alert severity={intakeEnabled ? "success" : "warning"} icon={<NotificationsActiveRoundedIcon fontSize="inherit" />}>
                  Intake automático {intakeEnabled ? "activado" : "desactivado"}. Los mensajes sin evidencia útil se guardan como ignorados.
                </Alert>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<LinkRoundedIcon />}
                    onClick={handleConnect}
                    disabled={saving}
                    sx={{ borderRadius: 999, px: 2.2, fontWeight: 800 }}
                  >
                    Conectar / regenerar QR
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LinkOffRoundedIcon />}
                    onClick={handleDisconnect}
                    disabled={saving || !canDisconnect}
                    sx={{ borderRadius: 999, px: 2.2, fontWeight: 800 }}
                  >
                    Desconectar
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<SyncRoundedIcon />}
                    onClick={handleConnect}
                    disabled={saving}
                    sx={{ borderRadius: 999, px: 2.2, fontWeight: 800 }}
                  >
                    Reintentar estado
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Stack spacing={2.5}>
              <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
                <Typography fontSize={18} fontWeight={900} color={APP_PALETTE.text.primary}>
                  Intake automático
                </Typography>
                <Typography variant="body2" color={APP_PALETTE.text.secondary} mt={0.8}>
                  Activa esta opción cuando quieras que los archivos entrantes pasen por OCR y se propongan como comprobantes.
                </Typography>

                <FormControlLabel
                  sx={{ mt: 1.5, alignItems: "flex-start" }}
                  control={
                    <Switch
                      checked={Boolean(intakeEnabled)}
                      onChange={handleToggleIntake}
                      disabled={saving}
                    />
                  }
                  label={
                    <Box>
                      <Typography fontWeight={800} color={APP_PALETTE.text.primary}>
                        {intakeEnabled ? "Procesar mensajes entrantes" : "Ignorar mensajes entrantes"}
                      </Typography>
                      <Typography variant="body2" color={APP_PALETTE.text.secondary}>
                        Si el intake está apagado, los adjuntos siguen guardándose como evidencia, pero no pasan a revisión automática.
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
                <Typography fontSize={18} fontWeight={900} color={APP_PALETTE.text.primary}>
                  Cómo funciona
                </Typography>
                <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                  {[
                    "Se crea una instancia Evolution por usuario.",
                    "El webhook llega al backend con el nombre de la instancia.",
                    "Los mensajes con evidencia pobre quedan marcados como ignored.",
                    "Puedes apagar el intake sin desconectar la sesión.",
                  ].map((item) => (
                    <Box key={item} sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                      <Box sx={{ mt: 0.65, width: 8, height: 8, borderRadius: "50%", bgcolor: APP_PALETTE.brand.primary, flexShrink: 0 }} />
                      <Typography variant="body2" color={APP_PALETTE.text.secondary} sx={{ lineHeight: 1.55 }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, color: APP_PALETTE.text.primary }}>
          Escanea el QR
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
            <Box
              sx={{
                width: "100%",
                minHeight: 280,
                borderRadius: 3,
                border: `1px solid ${APP_PALETTE.surfaces.border}`,
                bgcolor: APP_PALETTE.surface,
                display: "grid",
                placeItems: "center",
                p: 2,
              }}
            >
              {qrCode ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <QRCodeSVG value={qrCode} size={240} level="M" />
                </Box>
              ) : (
                <Box sx={{ textAlign: "center" }}>
                  <QrCode2RoundedIcon sx={{ fontSize: 54, color: APP_PALETTE.brand.primary }} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    La sesión está conectada o el servidor no devolvió un QR nuevo.
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Si el QR no aparece, vuelve a pulsar conectar para regenerarlo.
            </Typography>
            <Button fullWidth variant="contained" onClick={() => setQrOpen(false)} sx={{ borderRadius: 999, fontWeight: 800 }}>
              Cerrar
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}