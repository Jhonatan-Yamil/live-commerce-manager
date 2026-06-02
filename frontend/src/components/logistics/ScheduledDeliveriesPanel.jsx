import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
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
import { toDateIso, summarizeItems, sumItems, normalizeLocationLabel, normalizeTransportCompanies } from "../../utils/logistics";
import DeliverySlip from "./DeliverySlip";
import PrintIcon from "@mui/icons-material/Print";
import TablePager from "../common/TablePager";
import { emitDeliverySchedulesUpdated, useDeliverySchedulesUpdates } from "../../hooks/useDeliverySchedulesUpdates";
import { formatCurrencyBs } from "../../utils/formatters";

const STATUS_LABELS = {
  scheduled: "Agendado",
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

  const loadSchedules = async () => {
    const res = await deliverySchedulesApi.list();
    setSchedules(res.data || []);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  useDeliverySchedulesUpdates(loadSchedules);

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

  const isPendingProblem = (schedule) => {
    try {
      if (!schedule || !schedule.scheduled_date) return false;
      if (schedule.status === "delivered") return false;
      if (schedule.status === "not_delivered") return true; 
      const rawDate = String(schedule.scheduled_date).slice(0, 10);
      const parts = rawDate.split("-").map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return false;
      const scheduled = new Date(parts[0], parts[1] - 1, parts[2]);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return scheduled.getTime() < startOfToday.getTime(); 
    } catch { return false; }
  };

  const openDetail = (schedule) => {
    setDetailDialog({ open: true, schedule });
    (async () => {
      try {
        const res = await deliverySchedulesApi.getByOrder(schedule.order_id);
        setScheduleHistory(res.data || []);
      } catch {
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
    emitDeliverySchedulesUpdated();
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
    const nextTransportCompanies = normalizeTransportCompanies(transportCompanies);
    const payload = {
      delivery_mode: nextTransportCompanies.length > 0 ? "other_city" : "same_city",
      transport_companies: nextTransportCompanies,
    };

    if (next && next !== original) payload.delivery_location = next;
    if (payload.delivery_location || payload.transport_companies.length > 0 || note !== (detailDialog.schedule.notes || "")) {
      payload.notes = note || undefined;
      await deliverySchedulesApi.updateLocation(detailDialog.schedule.id, payload);
    }

    if (rescheduleDate) {
      await deliverySchedulesApi.reschedule(detailDialog.schedule.id, { new_date: rescheduleDate, notes: note || undefined });
    }

    closeDetail();
    await refresh();
  };

  const handleUpdateLocation = async () => {
    if (!detailDialog.schedule) return;
    await deliverySchedulesApi.updateLocation(detailDialog.schedule.id, {
      delivery_location: location.trim(),
      delivery_mode: normalizeTransportCompanies(transportCompanies).length > 0 ? "other_city" : "same_city",
      transport_companies: normalizeTransportCompanies(transportCompanies),
    });
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

            const highlight = isPendingProblem(schedule);

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
                <TableCell>{formatCurrencyBs(order?.total)}</TableCell>
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

      <Dialog open={detailDialog.open} onClose={closeDetail} fullWidth maxWidth="sm">
        {detailDialog.schedule && (() => {
          const order = orderById.get(detailDialog.schedule.order_id);
          const schedule = detailDialog.schedule;
          const isOtherCity = schedule.delivery_mode === "other_city" ||
            (schedule.delivery_location || "").toLowerCase().startsWith("otra ciudad");
          const displayLocation = isOtherCity
            ? (schedule.destination_city || "")
            : (schedule.location || schedule.delivery_location || "");
          const displayTransport = normalizeTransportCompanies(schedule.transport_companies);

          return (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Typography fontWeight={600} fontSize={16}>
                  {order?.client?.full_name || "Pedido"} — Pedido #{schedule.order_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Programado para {toDateIso(schedule.scheduled_date)} · {STATUS_LABELS[schedule.status] || schedule.status}
                </Typography>
              </DialogTitle>

              <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>

                <Box>
                  <Typography fontSize={11} fontWeight={600} color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                    Destino de entrega
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={0.25}>Tipo</Typography>
                      <Typography fontSize={14} fontWeight={500}>
                        {isOtherCity ? "Envío a otra ciudad" : "Entrega local"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={0.25}>
                        {isOtherCity ? "Ciudad / Departamento" : "Dirección"}
                      </Typography>
                      <Typography fontSize={14} fontWeight={500}>
                        {displayLocation || "—"}
                      </Typography>
                    </Box>
                    {isOtherCity && displayTransport.length > 0 && (
                      <Box sx={{ gridColumn: "1 / -1" }}>
                        <Typography fontSize={12} color="text.secondary" mb={0.25}>Empresas de transporte</Typography>
                        <Typography fontSize={14}>{displayTransport.join(", ")}</Typography>
                      </Box>
                    )}
                    {schedule.notes && (
                      <Box sx={{ gridColumn: "1 / -1" }}>
                        <Typography fontSize={12} color="text.secondary" mb={0.25}>Notas</Typography>
                        <Typography fontSize={14}>{schedule.notes}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography fontSize={11} fontWeight={600} color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                    Cliente
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={0.25}>Nombre</Typography>
                      <Typography fontSize={14}>{order?.client?.full_name || "—"}</Typography>
                    </Box>
                    <Box>
                      <Typography fontSize={12} color="text.secondary" mb={0.25}>Teléfono</Typography>
                      <Typography fontSize={14}>{order?.client?.phone || "—"}</Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography fontSize={11} fontWeight={600} color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                    Productos · {sumItems(order)} prenda{sumItems(order) !== 1 ? "s" : ""}
                  </Typography>
                  <Box sx={{ border: "0.5px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
                    {order?.items?.length > 0 ? order.items.map((it, idx) => (
                      <Box key={it.id || it.product_id} sx={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        px: 1.5, py: 1,
                        borderTop: idx > 0 ? "0.5px solid" : "none",
                        borderColor: "divider",
                      }}>
                        <Typography fontSize={13}>{it.product?.name || `Producto #${it.product_id}`}</Typography>
                        <Typography fontSize={13} color="text.secondary">
                          x{it.quantity} · {formatCurrencyBs(it.unit_price)}
                        </Typography>
                      </Box>
                    )) : (
                      <Box sx={{ px: 1.5, py: 1 }}>
                        <Typography fontSize={13} color="text.secondary">Sin productos</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {scheduleHistory.length > 1 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography fontSize={11} fontWeight={600} color="text.secondary"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                        Historial
                      </Typography>
                      <Box sx={{ border: "0.5px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
                        {scheduleHistory.map((s, idx) => (
                          <Box key={s.id} sx={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            px: 1.5, py: 1,
                            borderTop: idx > 0 ? "0.5px solid" : "none",
                            borderColor: "divider",
                          }}>
                            <Typography fontSize={13}>{toDateIso(s.scheduled_date)}</Typography>
                            <Typography fontSize={13} color="text.secondary">
                              {STATUS_LABELS[s.status] || s.status}{s.notes ? ` — ${s.notes}` : ""}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </>
                )}

              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={closeDetail}>Cerrar</Button>
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
