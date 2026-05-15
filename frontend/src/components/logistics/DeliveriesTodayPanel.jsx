import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { APP_PALETTE } from "../../theme/palette";
import { deliverySchedulesApi } from "../../services/api";
import { summarizeItems, sumItems, toDateIso } from "../../utils/logistics";
import DeliverySlip from "./DeliverySlip";
import PrintIcon from "@mui/icons-material/Print";
import { normalizeLocationLabel } from "../../utils/logistics";
import { emitDeliverySchedulesUpdated, useDeliverySchedulesUpdates } from "../../hooks/useDeliverySchedulesUpdates";
import { formatCurrencyBs } from "../../utils/formatters";

export default function DeliveriesTodayPanel({ orders = [], onUpdate, brandLogoUrl }) {
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [manageDialog, setManageDialog] = useState({ open: false, schedule: null });
  const [slipDialog, setSlipDialog] = useState({ open: false, schedule: null });
  const [note, setNote] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [location, setLocation] = useState("");

  const loadToday = async () => {
    const res = await deliverySchedulesApi.listToday();
    setTodaySchedules(res.data || []);
  };

  useEffect(() => {
    loadToday();
  }, []);

  useDeliverySchedulesUpdates(loadToday);

  const orderById = useMemo(() => {
    return new Map(orders.map((order) => [order.id, order]));
  }, [orders]);

  const openManage = (schedule) => {
    setManageDialog({ open: true, schedule });
    setNote(schedule.notes || "");
    setRescheduleDate("");
    setLocation(schedule.delivery_location || "");
  };

  const closeManage = () => setManageDialog({ open: false, schedule: null });

  const openSlip = (schedule) => {
    setSlipDialog({ open: true, schedule });
  };

  const closeSlip = () => setSlipDialog({ open: false, schedule: null });

  const refresh = async () => {
    await loadToday();
    if (onUpdate) onUpdate();
    emitDeliverySchedulesUpdated();
  };

  const markDelivered = async () => {
    if (!manageDialog.schedule) return;
    await syncLocationIfChanged();
    await deliverySchedulesApi.markDelivered(manageDialog.schedule.id, { notes: note || undefined });
    closeManage();
    await refresh();
  };

  const markNotDelivered = async () => {
    if (!manageDialog.schedule) return;
    await syncLocationIfChanged();
    await deliverySchedulesApi.markNotDelivered(manageDialog.schedule.id, { notes: note || undefined });
    closeManage();
    await refresh();
  };

  const handleReschedule = async () => {
    if (!manageDialog.schedule || !rescheduleDate) return;
    await syncLocationIfChanged();
    await deliverySchedulesApi.reschedule(manageDialog.schedule.id, { new_date: rescheduleDate, notes: note || undefined });
    closeManage();
    await refresh();
  };

  const saveChanges = async () => {
    if (!manageDialog.schedule) return;
    await syncLocationIfChanged();
    if (rescheduleDate) {
      await deliverySchedulesApi.reschedule(manageDialog.schedule.id, { new_date: rescheduleDate, notes: note || undefined });
    }
    closeManage();
    await refresh();
  };

  const syncLocationIfChanged = async () => {
    if (!manageDialog.schedule) return;
    const original = String(manageDialog.schedule.delivery_location || "").trim();
    const next = String(location || "").trim();
    if (!next || next === original) return;
    await deliverySchedulesApi.updateLocation(manageDialog.schedule.id, { delivery_location: next });
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
      <Typography variant="h6" fontWeight={700} color={APP_PALETTE.text.primary} mb={0.5}>
        Entregas para hoy
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Revisa las entregas agendadas para hoy, con cliente, teléfono, detalle y notas.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {todaySchedules.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No hay entregas programadas para hoy
          </Typography>
        )}

        {todaySchedules.map((schedule) => {
          const order = orderById.get(schedule.order_id);
          const client = order?.client;
          const itemCount = sumItems(order);
          const itemSummary = summarizeItems(order);

          return (
            <Box
              key={schedule.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${APP_PALETTE.surfaces.border}`,
                background: APP_PALETTE.surfaces.subtle,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700}>
                    {client?.full_name || `Pedido #${schedule.order_id}`}
                    {order?.id ? ` — Pedido #${order.id}` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {client?.phone || "Sin teléfono"} · {itemCount} prenda(s) · {formatCurrencyBs(order?.total)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {itemSummary}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Destino: {normalizeLocationLabel(schedule.delivery_location)}
                  </Typography>
                  {schedule.notes && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Notas: {schedule.notes}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => openSlip(schedule)}>
                    Imprimir
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => openManage(schedule)}>
                    Gestionar
                  </Button>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Dialog open={manageDialog.open} onClose={closeManage} fullWidth maxWidth="sm">
        <DialogTitle>Gestionar entrega de hoy</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Marca si se entregó, si no se pudo entregar, o cambia la fecha si el cliente pidió reprogramar.
          </DialogContentText>
          <Box sx={{ mt: 2, display: "grid", gap: 1.5 }}>
            <TextField
              size="small"
              label="Lugar de entrega"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              helperText="Puedes cambiar ciudad, zona o dirección hasta último momento."
            />
            <TextField size="small" label="Notas" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
            <TextField
              size="small"
              type="date"
              label="Reprogramar para"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeManage}>Cerrar</Button>
          <Button variant="outlined" onClick={saveChanges}>
            Guardar cambios
          </Button>
          <Button color="error" onClick={markNotDelivered}>
            No entregado
          </Button>
          <Button variant="contained" color="primary" onClick={markDelivered}>
            Entregado
          </Button>
        </DialogActions>
      </Dialog>

      <DeliverySlip
        open={slipDialog.open}
        onClose={closeSlip}
        delivery={slipDialog.schedule}
        order={slipDialog.schedule ? orderById.get(slipDialog.schedule.order_id) : null}
        client={slipDialog.schedule && orderById.get(slipDialog.schedule.order_id) ? orderById.get(slipDialog.schedule.order_id).client : null}
        brandLogoUrl={brandLogoUrl}
      />
    </Paper>
  );
}
