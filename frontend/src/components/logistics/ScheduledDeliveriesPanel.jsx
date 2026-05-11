import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { APP_PALETTE } from "../../theme/palette";
import { deliverySchedulesApi } from "../../services/api";
import { toDateIso, summarizeItems, sumItems, normalizeLocationLabel } from "../../utils/logistics";
import DeliverySlip from "./DeliverySlip";
import PrintIcon from "@mui/icons-material/Print";
import TablePager from "../common/TablePager";

const STATUS_LABELS = {
  scheduled: "Agendado",
  rescheduled: "Reprogramado",
  not_delivered: "No entregado",
  delivered: "Entregado",
};

export default function ScheduledDeliveriesPanel({ orders = [], onUpdate, brandLogoUrl }) {
  const [schedules, setSchedules] = useState([]);
  const [scheduleHistory, setScheduleHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailDialog, setDetailDialog] = useState({ open: false, schedule: null });
  const [slipDialog, setSlipDialog] = useState({ open: false, schedule: null });
  const [note, setNote] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [location, setLocation] = useState("");

  const loadSchedules = async () => {
    const res = await deliverySchedulesApi.list();
    setSchedules(res.data || []);
  };

  useEffect(() => {
    loadSchedules();
    const handler = () => loadSchedules();
    window.addEventListener("deliverySchedulesUpdated", handler);
    return () => window.removeEventListener("deliverySchedulesUpdated", handler);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const sortedSchedules = useMemo(() => {
    return [...(schedules || [])].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || (Number(b.id) - Number(a.id))
    );
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedSchedules.filter((schedule) => {
      const order = orderById.get(schedule.order_id);
      const clientName = order?.client?.full_name?.toLowerCase() || "";
      const orderLabel = String(schedule.order_id);
      const locationLabel = (schedule.delivery_location || "").toLowerCase();
      const matchesSearch = !term || orderLabel.includes(term) || clientName.includes(term) || locationLabel.includes(term);
      const matchesStatus = statusFilter === "all" || schedule.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sortedSchedules, orderById, search, statusFilter]);

  const pagedSchedules = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSchedules.slice(start, start + rowsPerPage);
  }, [filteredSchedules, page, rowsPerPage]);

  const getScheduleDestination = (schedule) => {
    const canonical = schedule.location || schedule.destination_city;
    return canonical || normalizeLocationLabel(schedule.delivery_location);
  };

  const isYesterdayNotDelivered = (schedule) => {
    try {
      if (!schedule || !schedule.scheduled_date) return false;
      if (schedule.status === "delivered") return false;
      const rawDate = String(schedule.scheduled_date).slice(0, 10);
      const parts = rawDate.split("-").map((part) => Number(part));
      if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return false;
      const scheduled = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return scheduled.getTime() < startOfToday.getTime();
    } catch (e) {
      return false;
    }
  };

  const openDetail = (schedule) => {
    setDetailDialog({ open: true, schedule });
    setNote(schedule.notes || "");
    setRescheduleDate("");
    setLocation(schedule.delivery_location || "");
    (async () => {
      try {
        const res = await deliverySchedulesApi.getByOrder(schedule.order_id);
        setScheduleHistory(res.data || []);
      } catch (e) {
        setScheduleHistory([]);
      }
    })();
  };

  const closeDetail = () => setDetailDialog({ open: false, schedule: null });

  const openSlip = (schedule) => {
    setSlipDialog({ open: true, schedule });
  };

  const closeSlip = () => setSlipDialog({ open: false, schedule: null });

  const refresh = async () => {
    await loadSchedules();
    if (onUpdate) onUpdate();
    try {
      window.dispatchEvent(new CustomEvent("deliverySchedulesUpdated"));
    } catch (e) {
      // ignore
    }
  };

  const markDelivered = async () => {
    if (!detailDialog.schedule) return;
    await deliverySchedulesApi.markDelivered(detailDialog.schedule.id, { notes: note || undefined });
    closeDetail();
    await refresh();
  };

  const markNotDelivered = async () => {
    if (!detailDialog.schedule) return;
    await deliverySchedulesApi.markNotDelivered(detailDialog.schedule.id, { notes: note || undefined });
    closeDetail();
    await refresh();
  };

  const handleReschedule = async () => {
    if (!detailDialog.schedule || !rescheduleDate) return;
    await deliverySchedulesApi.reschedule(detailDialog.schedule.id, { new_date: rescheduleDate, notes: note || undefined });
    closeDetail();
    await refresh();
  };

  const saveChanges = async () => {
    if (!detailDialog.schedule) return;
    const original = String(detailDialog.schedule.delivery_location || "").trim();
    const next = String(location || "").trim();
    if (next && next !== original) {
      await deliverySchedulesApi.updateLocation(detailDialog.schedule.id, { delivery_location: next });
    }

    if (rescheduleDate) {
      await deliverySchedulesApi.reschedule(detailDialog.schedule.id, { new_date: rescheduleDate, notes: note || undefined });
    }

    closeDetail();
    await refresh();
  };

  const handleUpdateLocation = async () => {
    if (!detailDialog.schedule || !location.trim()) return;
    await deliverySchedulesApi.updateLocation(detailDialog.schedule.id, { delivery_location: location.trim() });
    closeDetail();
    await refresh();
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
      <Typography variant="h6" fontWeight={700} color={APP_PALETTE.text.primary} mb={0.5}>
        Agendados Global 
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Vista compacta en tabla para editar agendados futuros o pendientes sin ocupar demasiado espacio.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          sx={{ minWidth: 280 }}
          placeholder="Buscar por cliente, # pedido o destino"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="scheduled">Agendado</MenuItem>
          <MenuItem value="rescheduled">Reprogramado</MenuItem>
          <MenuItem value="not_delivered">No entregado</MenuItem>
          <MenuItem value="delivered">Entregado</MenuItem>
        </TextField>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Cliente</TableCell>
            <TableCell>Pedido</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Prendas</TableCell>
            <TableCell>Monto</TableCell>
            <TableCell>Destino</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedSchedules.map((schedule) => {
            const order = orderById.get(schedule.order_id);
            const client = order?.client;
            const itemCount = sumItems(order);

            const highlight = isYesterdayNotDelivered(schedule);

            return (
              <TableRow
                key={schedule.id}
                hover
                sx={highlight ? { backgroundColor: "#fff8e1", borderLeft: "4px solid #f6c343" } : {}}
              >
                <TableCell>{client?.full_name || "Sin cliente"}</TableCell>
                <TableCell>#{schedule.order_id}</TableCell>
                <TableCell>{toDateIso(schedule.scheduled_date)}</TableCell>
                <TableCell>{itemCount}</TableCell>
                <TableCell>Bs. {Number(order?.total || 0).toFixed(2)}</TableCell>
                <TableCell>{getScheduleDestination(schedule)}</TableCell>
                <TableCell>{STATUS_LABELS[schedule.status] || schedule.status}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                    <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => openSlip(schedule)}>
                      Imprimir
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => openDetail(schedule)}>
                      Ver
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {filteredSchedules.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>
                <Typography variant="caption" color="text.secondary">
                  No hay entregas agendadas pendientes.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {filteredSchedules.length > rowsPerPage && (
        <Box sx={{ mt: 1 }}>
          <TablePager
            count={filteredSchedules.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(0);
            }}
          />
        </Box>
      )}

      <Dialog open={detailDialog.open} onClose={closeDetail} fullWidth maxWidth="md">
        {detailDialog.schedule && (() => {
          const order = orderById.get(detailDialog.schedule.order_id);
          const canEdit = detailDialog.schedule.status !== "delivered";
          return (
            <>
              <DialogTitle>
                {order?.client?.full_name || "Pedido"} - Pedido #{detailDialog.schedule.order_id}
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {summarizeItems(order)}
                </DialogContentText>
                <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
                  <Box>
                    <Typography fontWeight={700} mb={0.5}>Productos</Typography>
                    {order?.items && order.items.length > 0 ? (
                      order.items.map((it) => (
                        <Box key={`${it.product_id}-${it.id || Math.random()}`} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                          <Typography>{it.product?.name || `Producto #${it.product_id}`}</Typography>
                          <Typography variant="caption" color="text.secondary">x{it.quantity} · Bs. {Number(it.unit_price || 0).toFixed(2)}</Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">Sin productos</Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography fontWeight={700} mb={0.5}>Cliente</Typography>
                    <Typography>{order?.client?.full_name || "Sin cliente"}</Typography>
                    <Typography variant="caption" color="text.secondary">Tel: {order?.client?.phone || "-"}</Typography>
                    <Typography variant="caption" color="text.secondary">Ciudad/Depto: {order?.client?.delivery_city || "-"} / {order?.client?.delivery_department || "-"}</Typography>
                    <Typography variant="caption" color="text.secondary">Dirección: {order?.client?.address || "-"}</Typography>
                  </Box>

                  <Box>
                    <Typography fontWeight={700} mb={0.5}>Estado de logística</Typography>
                    {order?.logistics && order.logistics.length > 0 ? (
                      order.logistics.map((l) => (
                        <Typography key={l.id} variant="caption" display="block">{l.status} — {toDateIso(l.created_at)}</Typography>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">Sin registros de logística</Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography fontWeight={700} mb={0.5}>Historial de reprogramaciones</Typography>
                    {scheduleHistory && scheduleHistory.length > 0 ? (
                      scheduleHistory.map((s) => (
                        <Box key={`hist-${s.id}`} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                          <Typography variant="caption">{toDateIso(s.scheduled_date)} — {s.status}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.notes || "-"}</Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">Sin historial</Typography>
                    )}
                  </Box>

                  <Box sx={{ display: "grid", gap: 1.5 }}>
                    <TextField
                      size="small"
                      label="Ubicación"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={!canEdit}
                    />
                    <TextField
                      size="small"
                      label="Notas"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      multiline
                      minRows={2}
                      disabled={!canEdit}
                    />
                    <TextField
                      size="small"
                      type="date"
                      label="Reprogramar para"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={!canEdit}
                    />
                    {!canEdit && (
                      <Typography variant="caption" color="text.secondary">
                        Esta entrega ya fue marcada como entregada. Solo se permite edición en entregas no entregadas.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDetail}>Cerrar</Button>
                <Button color="error" onClick={markNotDelivered} disabled={!canEdit}>
                  No entregado
                </Button>
                <Button variant="outlined" onClick={saveChanges} disabled={!canEdit || (!location.trim() && !rescheduleDate)}>
                  Guardar cambios
                </Button>
                <Button variant="contained" color="primary" onClick={markDelivered} disabled={!canEdit}>
                  Entregado
                </Button>
              </DialogActions>
            </>
          );
        })()}
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
