import { useState, useEffect, useRef } from "react";
import {
  Autocomplete, Box, Button, TextField, MenuItem, Typography, Paper,
  Chip, Stack, IconButton, Menu, Divider,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { intakeApi, ordersApi, paymentsApi } from "../services/api";
import SearchBar from "../components/common/SearchBar";
import TablePager from "../components/common/TablePager";
import { PAYMENT_STATUS_CONFIG } from "../utils/constants";
import OrderCompletionDialog from "../components/orders/OrderCompletionDialog";

const STATUS_LABELS_NEXT = {
  in_review: "Marcar en revisión",
  confirmed: "Confirmar pago ✓",
  rejected: "Rechazar pago ✗",
};

const NEXT_COLORS = {
  confirmed: "#10b981",
  rejected: "#ef4444",
  in_review: "#3b82f6",
};

const buildVoucherUrl = (voucherPath) => {
  if (!voucherPath) return null;
  if (/^https?:\/\//i.test(voucherPath)) return voucherPath;
  const cleanedPath = String(voucherPath).trim();
  const normalizedPath = cleanedPath.startsWith("/uploads/")
    ? cleanedPath
    : `/uploads/${cleanedPath.replace(/^\/+/, "")}`;
  return `http://localhost:8000${normalizedPath}`;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState({});
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [suggestions, setSuggestions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reassignOrder, setReassignOrder] = useState({});
  const [processingAction, setProcessingAction] = useState({});
  const [completionSuggestion, setCompletionSuggestion] = useState(null);
  const [showReassign, setShowReassign] = useState({});
  const [advancedMenu, setAdvancedMenu] = useState({ anchorEl: null, suggestionId: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const loadingRef = useRef(false);

  const load = async (withIndicator = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (withIndicator) setIsRefreshing(true);
    try {
      const [paymentsRes, suggestionsRes, ordersRes] = await Promise.all([
        paymentsApi.list(),
        intakeApi.listSuggestions(),
        ordersApi.list(),
      ]);
      setPayments(paymentsRes.data);
      setSuggestions((suggestionsRes.data || []).sort((a, b) => b.id - a.id));
      setOrders((ordersRes.data || []).sort((a, b) => b.id - a.id));
      setLastUpdatedAt(new Date());
    } finally {
      if (withIndicator) setIsRefreshing(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => { load(true); }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    const interval = setInterval(refreshIfVisible, 10000);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, []);

  const changeStatus = async (id, status) => {
    await paymentsApi.updateStatus(id, { status, notes: notes[id] || null });
    load();
  };

  const uploadVoucher = async (orderId) => {
    const file = files[orderId];
    if (!file) return alert("Selecciona un archivo primero");
    setUploading({ ...uploading, [orderId]: true });
    try {
      await paymentsApi.uploadVoucher(orderId, file);
      setFiles({ ...files, [orderId]: null });
      load();
    } catch {
      alert("Error al subir el comprobante");
    } finally {
      setUploading({ ...uploading, [orderId]: false });
    }
  };

  const handleSuggestionAction = async (intakeId, action) => {
    setProcessingAction({ ...processingAction, [intakeId]: true });
    try {
      if (action === "confirm") {
        await intakeApi.confirm(intakeId);
      } else if (action === "reject") {
        await intakeApi.reject(intakeId);
      } else if (action === "reprocess") {
        await intakeApi.reprocess(intakeId);
      } else if (action === "reassign") {
        const selected = reassignOrder[intakeId];
        if (!selected?.id) {
          alert("Selecciona un pedido sugerido para reasignar");
          return;
        }
        await intakeApi.reassign(intakeId, selected.id);
      }
      await load();
    } catch {
      alert("No se pudo completar la acción sobre la sugerencia");
    } finally {
      setProcessingAction({ ...processingAction, [intakeId]: false });
    }
  };

  const openOrderCompletion = (suggestion) => setCompletionSuggestion(suggestion);
  const closeOrderCompletion = () => setCompletionSuggestion(null);

  const openAdvancedMenu = (event, suggestionId) => {
    setAdvancedMenu({ anchorEl: event.currentTarget, suggestionId });
  };

  const closeAdvancedMenu = () => {
    setAdvancedMenu({ anchorEl: null, suggestionId: null });
  };

  const filtered = payments.filter((p) => {
    const matchSearch = !search || String(p.order_id).includes(search) || (p.client_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => b.id - a.id);

  const statusFilters = [
    {
      key: "paymentStatus",
      type: "select",
      label: "Estado",
      value: statusFilter,
      defaultValue: "all",
      onChange: (value) => {
        setStatusFilter(value);
        setPage(0);
      },
      options: [
        { value: "all", label: "Todos los estados" },
        { value: "pending", label: "Pendiente" },
        { value: "in_review", label: "En revision" },
        { value: "confirmed", label: "Confirmado" },
        { value: "rejected", label: "Rechazado" },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1a1a2e">Gestión de Pagos</Typography>
          {lastUpdatedAt && (
            <Typography variant="caption" color="text.secondary">
              Actualizado: {lastUpdatedAt.toLocaleTimeString("es-BO")}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          disabled={isRefreshing}
          onClick={() => load(true)}
        >
          {isRefreshing ? "Actualizando..." : "Actualizar ahora"}
        </Button>
      </Box>

      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <Typography variant="h6" fontWeight={700} color="#1a1a2e" mb={1.5}>
          Pagos por revisar
        </Typography>
        {suggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No hay sugerencias pendientes por revisar</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {suggestions.slice(0, 8).map((s) => (
              <Paper key={s.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                {(() => {
                  const reassignCandidates = orders.filter((o) => {
                    if (!s.matched_client_name) return true;
                    return (o.client?.full_name || "").toLowerCase().includes(s.matched_client_name.toLowerCase());
                  });
                  const amountLabel = s.extracted_amount != null
                    ? `Monto: Bs. ${Number(s.extracted_amount).toFixed(2)}`
                    : "Monto: no detectado";

                  return (
                    <>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Comprobante #{s.id} • {s.matched_client_name ? `Cliente: ${s.matched_client_name}` : "Cliente nuevo o no registrado"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      Pedido sugerido: #{s.matched_order_id || "-"} • Referencia: {s.extracted_reference || "No disponible"}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => openAdvancedMenu(e, s.id)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1, mb: 1 }}>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={amountLabel}
                    sx={{ fontWeight: 600 }}
                  />
                  {!s.matched_client_name && (
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={`Nombre: ${s.extracted_sender_name || "No detectado"}`}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Stack>

                {s.processing_status === "failed" && (
                  <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                    No se pudo leer este comprobante completamente. Puedes intentar nuevamente desde opciones.
                  </Typography>
                )}

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {s.needs_order_completion ? (
                    <Button size="small" variant="contained" color="warning" disabled={processingAction[s.id]} onClick={() => openOrderCompletion(s)}>
                      Aceptar y completar
                    </Button>
                  ) : (
                    <Button size="small" variant="contained" color="success" disabled={processingAction[s.id]} onClick={() => handleSuggestionAction(s.id, "confirm")}>
                      Aceptar pago
                    </Button>
                  )}
                  <Button size="small" variant="contained" color="error" disabled={processingAction[s.id]} onClick={() => handleSuggestionAction(s.id, "reject")}>Rechazar</Button>
                </Box>

                {showReassign[s.id] && (
                  <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <Autocomplete
                      options={reassignCandidates}
                      getOptionLabel={(o) => `${o.client?.full_name || "Cliente"} • Pedido #${o.id} • Bs. ${Number(o.total || 0).toFixed(2)}`}
                      value={reassignOrder[s.id] || null}
                      onChange={(_, value) => setReassignOrder({ ...reassignOrder, [s.id]: value })}
                      renderInput={(params) => (
                        <TextField {...params} size="small" placeholder="Selecciona el pedido correcto" />
                      )}
                      sx={{ width: 360 }}
                    />
                    <Button size="small" variant="outlined" disabled={processingAction[s.id]} onClick={() => handleSuggestionAction(s.id, "reassign")}>
                      Guardar pedido correcto
                    </Button>
                  </Box>
                )}

                <Menu
                  anchorEl={advancedMenu.anchorEl}
                  open={advancedMenu.suggestionId === s.id}
                  onClose={closeAdvancedMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem
                    onClick={async () => {
                      closeAdvancedMenu();
                      await handleSuggestionAction(s.id, "reprocess");
                    }}
                    disabled={processingAction[s.id]}
                  >
                    Volver a analizar comprobante
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      closeAdvancedMenu();
                      setShowReassign({ ...showReassign, [s.id]: !showReassign[s.id] });
                    }}
                  >
                    {showReassign[s.id] ? "Ocultar cambio de pedido" : "Cambiar pedido sugerido"}
                  </MenuItem>
                  <Divider />
                  <MenuItem disabled>
                    Opciones avanzadas
                  </MenuItem>
                </Menu>
                    </>
                  );
                })()}
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <SearchBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        filters={statusFilters}
        resultCount={filtered.length}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
          setPage(0);
        }}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => {
          const s = PAYMENT_STATUS_CONFIG[p.status];
          return (
            <Paper key={p.id} sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.color}` }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography fontWeight={700} fontSize={15} color="#1a1a2e">
                      {p.client_name || "Cliente desconocido"}
                    </Typography>
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Pedido #{p.order_id}
                    {p.order_total && <span style={{ marginLeft: 8, fontWeight: 600, color: "#4f46e5" }}>Bs. {p.order_total.toFixed(2)}</span>}
                    {p.order_created_at && <span style={{ marginLeft: 8 }}>{new Date(p.order_created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </Typography>
                  {p.voucher_path && (
                    <Box mt={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Comprobante:{" "}
                        <a href={buildVoucherUrl(p.voucher_path)} target="_blank" rel="noreferrer"
                          style={{ color: "#4f46e5", fontWeight: 600 }}>Ver comprobante</a>
                      </Typography>
                    </Box>
                  )}
                  {p.notes && <Typography variant="caption" color="text.secondary" display="block">Nota: {p.notes}</Typography>}
                  {p.reviewed_at && <Typography variant="caption" color="text.secondary" display="block">Revisado: {new Date(p.reviewed_at).toLocaleString("es-BO")}</Typography>}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 280 }}>
                  {p.status === "pending" && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, background: "#f8f9fc" }}>
                      <Typography variant="caption" fontWeight={500} color="#555" display="block" mb={1}>
                        Subir comprobante (imagen o PDF)
                      </Typography>
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setFiles({ ...files, [p.order_id]: e.target.files[0] })}
                        style={{ width: "100%", marginBottom: 8, fontSize: 13 }} />
                      {files[p.order_id] && (
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          📎 {files[p.order_id].name}
                        </Typography>
                      )}
                      <Button fullWidth variant="contained" size="small"
                        disabled={!files[p.order_id] || uploading[p.order_id]}
                        onClick={() => uploadVoucher(p.order_id)}
                        sx={{ background: files[p.order_id] ? "#4f46e5" : "#e0e0e0", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
                        {uploading[p.order_id] ? "Subiendo..." : "Registrar comprobante"}
                      </Button>
                    </Paper>
                  )}
                  {s.next.length > 0 && (
                    <Box>
                      <TextField size="small" fullWidth placeholder="Notas (opcional)" value={notes[p.id] || ""}
                        onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} sx={{ mb: 1 }} />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {s.next.map((ns) => (
                          <Button key={ns} fullWidth size="small" variant="contained"
                            onClick={() => changeStatus(p.id, ns)}
                            sx={{ background: NEXT_COLORS[ns], "&:hover": { filter: "brightness(0.9)" }, borderRadius: 2, fontSize: 12 }}>
                            {STATUS_LABELS_NEXT[ns]}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
        {filtered.length === 0 && (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography color="text.secondary">{search || statusFilter !== "all" ? "No se encontraron pagos" : "No hay pagos registrados"}</Typography>
          </Paper>
        )}
      </Box>

      {filtered.length > rowsPerPage && (
        <TablePager
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
        />
      )}

      <OrderCompletionDialog
        open={Boolean(completionSuggestion)}
        suggestion={completionSuggestion}
        onClose={closeOrderCompletion}
        onCompleted={load}
      />
    </Box>
  );
}