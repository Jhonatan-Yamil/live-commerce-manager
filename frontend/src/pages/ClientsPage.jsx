import { useState, useEffect } from "react";
import {
  Box, Button, TextField, Typography, Paper,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Grid,
} from "@mui/material";
import { clientsApi, ordersApi } from "../services/api";

const STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: "#f59e0b" },
  payment_in_review: { label: "En revisión", color: "#3b82f6" },
  payment_confirmed: { label: "Pago confirmado", color: "#10b981" },
  payment_rejected: { label: "Rechazado", color: "#ef4444" },
  in_delivery: { label: "En entrega", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#059669" },
  cancelled: { label: "Cancelado", color: "#6b7280" },
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", notes: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expanded, setExpanded] = useState({});

  const load = () => {
    clientsApi.list().then((r) => setClients(r.data));
    ordersApi.list().then((r) => setOrders(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (editing) {
      await clientsApi.update(editing.id, form);
    } else {
      await clientsApi.create(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ full_name: "", phone: "", address: "", notes: "" });
    load();
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({ full_name: c.full_name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setShowForm(true);
  };

  const getClientOrders = (clientId) => orders.filter((o) => o.client_id === clientId);

  const filtered = clients.filter((c) =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="#1a1a2e">Clientes</Typography>
        <Button variant="contained" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ full_name: "", phone: "", address: "", notes: "" }); }}
          sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
          {showForm ? "Cancelar" : "+ Nuevo cliente"}
        </Button>
      </Box>

      {showForm && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <Typography variant="h6" fontWeight={600} mb={2}>{editing ? "Editar cliente" : "Registrar cliente"}</Typography>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Nombre completo *" size="small" fullWidth
                value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Teléfono / WhatsApp" size="small" fullWidth
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+591 7..." />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Dirección" size="small" fullWidth
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Notas" size="small" fullWidth
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
          <Button variant="contained" onClick={handleSubmit} disabled={!form.full_name}
            sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
            {editing ? "Guardar cambios" : "Registrar"}
          </Button>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", display: "flex", gap: 2, alignItems: "center" }}>
        <TextField size="small" placeholder="Buscar por nombre o teléfono..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ width: 280 }} />
        <Typography variant="caption" color="text.secondary">{filtered.length} cliente(s)</Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#f8f9fc" }}>
              {["Nombre", "Teléfono", "Dirección", "Notas", "Pedidos", "Acciones"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#888", fontSize: 13 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((c) => {
              const clientOrders = getClientOrders(c.id);
              const isExpanded = expanded[c.id];
              return (
                <>
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{c.full_name}</TableCell>
                    <TableCell sx={{ color: "#666" }}>{c.phone || "—"}</TableCell>
                    <TableCell sx={{ color: "#666" }}>{c.address || "—"}</TableCell>
                    <TableCell sx={{ color: "#888", fontSize: 13 }}>{c.notes || "—"}</TableCell>
                    <TableCell>
                      {clientOrders.length > 0 ? (
                        <Button size="small" variant="outlined"
                          onClick={() => setExpanded({ ...expanded, [c.id]: !isExpanded })}
                          sx={{ color: "#4f46e5", borderColor: "#4f46e5", borderRadius: 2, fontSize: 12 }}>
                          {isExpanded ? "▲ Ocultar" : `▼ ${clientOrders.length} pedido(s)`}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin pedidos</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => startEdit(c)}
                        sx={{ color: "#4f46e5", borderColor: "#c7d2fe", background: "#e0e7ff", borderRadius: 2, fontSize: 13 }}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && clientOrders.map((o) => {
                    const s = STATUS_LABELS[o.status] || { label: o.status, color: "#888" };
                    return (
                      <TableRow key={`order-${o.id}`} sx={{ background: "#f8f9fc" }}>
                        <TableCell sx={{ pl: 4, color: "#666", fontSize: 13 }}>└ Pedido #{o.id}</TableCell>
                        <TableCell sx={{ color: "#888", fontSize: 12 }}>
                          {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#4f46e5", fontSize: 13 }}>Bs. {Number(o.total).toFixed(2)}</TableCell>
                        <TableCell colSpan={2}>
                          <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                            {s.label}
                          </span>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })}
                </>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#aaa" }}>
                  {search ? "No se encontraron clientes" : "No hay clientes registrados"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
    </Box>
  );
}