import { useState, useEffect } from "react";
import {
  Box, Button, TextField, Typography, Paper, Grid, MenuItem, TablePagination,
} from "@mui/material";
import { logisticsApi, ordersApi } from "../services/api";

const DELIVERY_TYPE_LABELS = {
  pickup: { label: "Retiro en tienda", icon: "🏪" },
  shipping: { label: "Envío a otra ciudad", icon: "🚚" },
  coordinated: { label: "Entrega coordinada", icon: "📍" },
};

const DELIVERY_STATUS = {
  in_store: { label: "En tienda", color: "#f59e0b" },
  sent: { label: "Enviado", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#10b981" },
  failed: { label: "Fallido", color: "#ef4444" },
};

function PrepareDeliveryMode({ orders, logistics, onUpdate }) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const pendingLogistics = logistics.filter(
    (l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed"
  );
  const pendingOrderIds = new Set(pendingLogistics.map((l) => l.order_id));

  const clientsWithPending = {};
  orders.forEach((o) => {
    if (pendingOrderIds.has(o.id) && o.client) {
      if (!clientsWithPending[o.client_id]) {
        clientsWithPending[o.client_id] = { id: o.client_id, name: o.client.full_name, orders: [] };
      }
      clientsWithPending[o.client_id].orders.push(o);
    }
  });

  const clientList = Object.values(clientsWithPending).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getLogisticsForOrder = (orderId) => logistics.find((l) => l.order_id === orderId);

  const handleMarkDelivered = async (logisticsId) => {
    await logisticsApi.update(logisticsId, { delivery_status: "delivered" });
    onUpdate();
  };

  const handleMarkAllDelivered = async (client) => {
    for (const order of client.orders) {
      const log = getLogisticsForOrder(order.id);
      if (log && log.delivery_status !== "delivered") {
        await logisticsApi.update(log.id, { delivery_status: "delivered" });
      }
    }
    setSelectedClient(null);
    onUpdate();
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
      <Typography variant="h6" fontWeight={700} color="#1a1a2e" mb={0.5}>🗓️ Modo preparación de entregas</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Busca un cliente para ver todos sus pedidos pendientes y marcarlos como entregados
      </Typography>

      <TextField size="small" fullWidth placeholder="Buscar cliente..." value={search}
        onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }} sx={{ mb: 1.5 }} />

      {search && !selectedClient && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
          {clientList.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ p: 1.5, display: "block" }}>
              No se encontraron clientes con pedidos pendientes
            </Typography>
          ) : (
            clientList.map((c) => (
              <Box key={c.id} onClick={() => { setSelectedClient(c); setSearch(c.name); }}
                sx={{ p: 1.5, cursor: "pointer", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", "&:hover": { background: "#f0f4ff" } }}>
                <Typography fontWeight={600}>{c.name}</Typography>
                <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                  {c.orders.length} pedido(s) pendiente(s)
                </span>
              </Box>
            ))
          )}
        </Paper>
      )}

      {selectedClient && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box>
              <Typography fontWeight={700} fontSize={15} display="inline">{selectedClient.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {selectedClient.orders.length} pedido(s) pendiente(s)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="contained" onClick={() => handleMarkAllDelivered(selectedClient)}
                sx={{ background: "#10b981", "&:hover": { background: "#059669" }, borderRadius: 2, fontSize: 12 }}>
                ✓ Marcar todos como entregados
              </Button>
              <Button size="small" variant="outlined" onClick={() => { setSelectedClient(null); setSearch(""); }}
                sx={{ color: "#666", borderColor: "#ddd", borderRadius: 2 }}>
                Limpiar
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {selectedClient.orders.map((o) => {
              const log = getLogisticsForOrder(o.id);
              const isDelivered = log?.delivery_status === "delivered";
              return (
                <Box key={o.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, borderRadius: 2, background: isDelivered ? "#f0fdf4" : "#f8f9fc", border: `1px solid ${isDelivered ? "#86efac" : "#e5e7eb"}` }}>
                  <Box>
                    <Typography fontWeight={600} display="inline">Pedido #{o.id}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color="#4f46e5" sx={{ ml: 1 }}>
                      Bs. {Number(o.total).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {o.items?.length || 0} ítem(s)
                    </Typography>
                  </Box>
                  {isDelivered ? (
                    <span style={{ background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>✓ Entregado</span>
                  ) : (
                    <Button size="small" variant="contained" onClick={() => handleMarkDelivered(log.id)}
                      sx={{ background: "#10b981", "&:hover": { background: "#059669" }, borderRadius: 2, fontSize: 12 }}>
                      Marcar entregado
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

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
  });

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };

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

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" placeholder="Buscar por cliente o # pedido..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ width: 260 }} />
        <TextField select size="small" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ width: 180 }}>
          <MenuItem value="all">Todos los estados</MenuItem>
          <MenuItem value="in_store">En tienda</MenuItem>
          <MenuItem value="sent">Enviado</MenuItem>
          <MenuItem value="delivered">Entregado</MenuItem>
          <MenuItem value="failed">Fallido</MenuItem>
        </TextField>
        <Typography variant="caption" color="text.secondary">{filtered.length} resultado(s)</Typography>
      </Paper>

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
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
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
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Box>
  );
}