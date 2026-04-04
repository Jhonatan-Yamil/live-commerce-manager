import { useState, useEffect } from "react";
import {
  Box, Button, TextField, Typography, Paper, Grid, MenuItem,
} from "@mui/material";
import { logisticsApi, ordersApi } from "../services/api";
import SearchBar from "../components/common/SearchBar";
import StatusBadge from "../components/common/StatusBadge";
import TablePager from "../components/common/TablePager";
import PrepareDeliveryMode from "../components/logistics/PrepareDeliveryMode";
import { DELIVERY_STATUS, DELIVERY_TYPE_LABELS } from "../utils/constants";

export default function LogisticsPage() {
  const [logistics, setLogistics] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ selected_orders: [], delivery_type: "pickup", address: "" });
  const [editing, setEditing] = useState({});
  const [orderSearch, setOrderSearch] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = () => {
    logisticsApi.list().then((r) => setLogistics(r.data));
    ordersApi.list().then((r) => setOrders(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.selected_orders?.length) return alert("Selecciona al menos un pedido");
    for (const orderId of form.selected_orders) {
      await logisticsApi.create({ order_id: orderId, delivery_type: form.delivery_type, address: form.address || null });
    }
    setShowForm(false);
    setForm({ selected_orders: [], delivery_type: "pickup", address: "" });
    load();
  };

  const handleUpdate = async (id) => {
    await logisticsApi.update(id, editing[id]);
    setEditing({ ...editing, [id]: null });
    load();
  };

  const logisticsOrderIds = new Set(logistics.map((l) => l.order_id));
  const availableOrders = orders.filter((o) => !logisticsOrderIds.has(o.id) && o.status === "payment_confirmed");
  const filteredAvailableOrders = availableOrders.filter((o) => {
    const s = orderSearch.toLowerCase();
    return String(o.id).includes(s) || (o.client?.full_name || "").toLowerCase().includes(s);
  });

  const getPendingOrdersByClient = (clientId) => {
    const clientOrders = orders.filter((o) => o.client_id === clientId);
    const pendingIds = logistics.filter((l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed").map((l) => l.order_id);
    return clientOrders.filter((o) => pendingIds.includes(o.id));
  };

  const filtered = logistics.filter((l) => {
    const relatedOrder = orders.find((o) => o.id === l.order_id);
    const matchSearch = !search || String(l.order_id).includes(search) || (relatedOrder?.client?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.delivery_status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => b.id - a.id);

  const statusFilters = [
    {
      key: "deliveryStatus",
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
        { value: "in_store", label: "En tienda" },
        { value: "sent", label: "Enviado" },
        { value: "delivered", label: "Entregado" },
        { value: "failed", label: "Fallido" },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="#1a1a2e">Logística</Typography>
        <Button variant="contained" onClick={() => setShowForm(!showForm)}
          sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
          {showForm ? "Cancelar" : "+ Nuevo envío"}
        </Button>
      </Box>

      {showForm && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Crear registro de entrega</Typography>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={500} color="#555" display="block" mb={1}>
                Seleccionar pedidos a entregar (pago confirmado) — puedes seleccionar varios
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1 }}>
                <TextField size="small" fullWidth placeholder="Buscar por nombre de cliente o # de pedido..."
                  value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} sx={{ mb: 1 }} />
                <Box sx={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {filteredAvailableOrders.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                      {orderSearch ? "No se encontraron pedidos" : "No hay pedidos con pago confirmado pendientes de entrega"}
                    </Typography>
                  ) : (
                    filteredAvailableOrders.map((o) => {
                      const isSelected = form.selected_orders?.includes(o.id);
                      return (
                        <Box key={o.id} component="label"
                          sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, borderRadius: 1.5, cursor: "pointer", background: isSelected ? "#e0e7ff" : "#fff", border: `1px solid ${isSelected ? "#4f46e5" : "#f0f0f0"}`, "&:hover": { background: isSelected ? "#e0e7ff" : "#f8f9fc" } }}>
                          <input type="checkbox" checked={isSelected}
                            onChange={() => {
                              const current = form.selected_orders || [];
                              const updated = isSelected ? current.filter((id) => id !== o.id) : [...current, o.id];
                              setForm({ ...form, selected_orders: updated });
                            }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={600} display="inline" fontSize={14}>#{o.id}</Typography>
                            <Typography display="inline" fontSize={14} sx={{ ml: 1 }}>{o.client?.full_name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                            </Typography>
                            <Typography variant="caption" fontWeight={600} color="#4f46e5" sx={{ ml: 1 }}>
                              Bs. {Number(o.total).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Paper>
              {form.selected_orders?.length > 0 && (
                <Typography variant="caption" fontWeight={600} color="#4f46e5" sx={{ mt: 0.5, display: "block" }}>
                  {form.selected_orders.length} pedido(s) seleccionado(s)
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select size="small" fullWidth label="Tipo de entrega" value={form.delivery_type}
                onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}>
                <MenuItem value="pickup">🏪 Retiro en tienda</MenuItem>
                <MenuItem value="shipping">🚚 Envío a otra ciudad</MenuItem>
                <MenuItem value="coordinated">📍 Entrega coordinada</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Dirección / Punto de encuentro" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={form.delivery_type === "pickup" ? "Dirección de la tienda" : form.delivery_type === "shipping" ? "Ciudad de destino" : "Punto de encuentro"} />
            </Grid>
          </Grid>
          <Button variant="contained" onClick={handleCreate} disabled={!form.selected_orders?.length}
            sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
            Crear registro
          </Button>
        </Paper>
      )}

      <PrepareDeliveryMode orders={orders} logistics={logistics} onUpdate={load} />

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
        {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((l) => {
          const s = DELIVERY_STATUS[l.delivery_status];
          const t = DELIVERY_TYPE_LABELS[l.delivery_type];
          const relatedOrder = orders.find((o) => o.id === l.order_id);
          const clientId = relatedOrder?.client_id;
          const clientName = relatedOrder?.client?.full_name;
          const pendingOrders = clientId ? getPendingOrdersByClient(clientId) : [];
          const isEditing = !!editing[l.id];

          return (
            <Paper key={l.id} sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.color}` }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box mb={0.5}>
                    <Typography fontWeight={700} fontSize={15} display="inline">Pedido #{l.order_id}</Typography>
                    {clientName && <Typography display="inline" color="#555" fontWeight={500} fontSize={14} sx={{ ml: 1 }}>— {clientName}</Typography>}
                    {relatedOrder && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{new Date(relatedOrder.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}</Typography>}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 0.5 }}>
                    <StatusBadge label={s.label} color={s.color} />
                    <Typography variant="caption" color="text.secondary">{t.icon} {t.label}</Typography>
                    {pendingOrders.length > 1 && <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>⚠️ {pendingOrders.length} pedidos pendientes</span>}
                    {pendingOrders.length === 1 && <span style={{ background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>✓ Único pendiente</span>}
                  </Box>
                  {l.address && <Typography variant="caption" color="text.secondary" display="block">📍 {l.address}</Typography>}
                  {l.tracking_notes && <Typography variant="caption" color="text.secondary" display="block">📝 {l.tracking_notes}</Typography>}
                </Box>

                <Box>
                  {!isEditing ? (
                    <Button size="small" variant="outlined"
                      onClick={() => setEditing({ ...editing, [l.id]: { delivery_status: l.delivery_status, tracking_notes: l.tracking_notes || "", address: l.address || "" } })}
                      sx={{ color: "#4f46e5", borderColor: "#c7d2fe", background: "#e0e7ff", borderRadius: 2, fontSize: 13 }}>
                      Actualizar
                    </Button>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 280 }}>
                      <TextField select size="small" fullWidth value={editing[l.id].delivery_status}
                        onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], delivery_status: e.target.value } })}>
                        <MenuItem value="in_store">En tienda</MenuItem>
                        <MenuItem value="sent">Enviado</MenuItem>
                        <MenuItem value="delivered">Entregado</MenuItem>
                        <MenuItem value="failed">Fallido</MenuItem>
                      </TextField>
                      <TextField size="small" fullWidth placeholder="Notas de seguimiento"
                        value={editing[l.id].tracking_notes}
                        onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], tracking_notes: e.target.value } })} />
                      <TextField size="small" fullWidth placeholder="Dirección / Punto de encuentro"
                        value={editing[l.id].address}
                        onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], address: e.target.value } })} />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button fullWidth size="small" variant="contained" onClick={() => handleUpdate(l.id)}
                          sx={{ background: "#10b981", "&:hover": { background: "#059669" }, borderRadius: 2, fontSize: 13 }}>
                          Guardar
                        </Button>
                        <Button fullWidth size="small" variant="outlined" onClick={() => setEditing({ ...editing, [l.id]: null })}
                          sx={{ color: "#666", borderColor: "#ddd", borderRadius: 2, fontSize: 13 }}>
                          Cancelar
                        </Button>
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
            <Typography color="text.secondary">No hay registros de logística</Typography>
          </Paper>
        )}
      </Box>

      {filtered.length > rowsPerPage && (
        <TablePager count={filtered.length} page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
        />
      )}
    </Box>
  );
}