import { useState, useEffect, useRef } from "react";
import {
  Box, Button, Chip, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TablePagination, Typography,
} from "@mui/material";
import { ordersApi, clientsApi, lotsApi, productsApi } from "../services/api";

const STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: "#f59e0b" },
  payment_in_review: { label: "Pago en revisión", color: "#3b82f6" },
  payment_confirmed: { label: "Pago confirmado", color: "#10b981" },
  payment_rejected: { label: "Pago rechazado", color: "#ef4444" },
  in_delivery: { label: "En entrega", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#059669" },
  cancelled: { label: "Cancelado", color: "#6b7280" },
};

function ClientAutocomplete({ clients, value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);
  const filtered = clients.filter((c) => c.full_name.toLowerCase().includes(value.toLowerCase()));
  const exactMatch = clients.find((c) => c.full_name.toLowerCase() === value.toLowerCase());
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  useEffect(() => { setHighlighted(0); }, [value]);
  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const sel = filtered[highlighted] || exactMatch; if (sel) { onSelect(sel); setOpen(false); } }
    else if (e.key === "Escape") setOpen(false);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown}
        placeholder="Escribir nombre del cliente..."
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
      {open && value.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
          {filtered.length > 0 ? filtered.map((c, i) => (
            <div key={c.id} onMouseDown={() => { onSelect(c); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", background: i === highlighted ? "#f0f4ff" : "#fff" }}
              onMouseEnter={() => setHighlighted(i)}>
              <span style={{ fontWeight: 600 }}>{c.full_name}</span>
              {c.phone && <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{c.phone}</span>}
            </div>
          )) : (
            <div style={{ padding: "10px 14px", color: "#888", fontSize: 13 }}>
              No encontrado — se creará <strong>"{value}"</strong> como nuevo cliente
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LotAutocomplete({ lots, value, onChange, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);
  const filtered = lots.filter((l) => l.name.toLowerCase().includes(value.toLowerCase()) || l.brand.toLowerCase().includes(value.toLowerCase()));
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  useEffect(() => { setHighlighted(0); }, [value]);
  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); } }
    else if (e.key === "Escape") setOpen(false);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown}
          placeholder="Sin lote (opcional)"
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
        {value && <button onMouseDown={onClear} style={{ padding: "6px 10px", background: "#f0f0f0", border: "none", borderRadius: 6, cursor: "pointer", color: "#888", fontSize: 13 }}>✕</button>}
      </div>
      {open && value.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
          {filtered.length > 0 ? filtered.map((l, i) => (
            <div key={l.id} onMouseDown={() => { onSelect(l); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", background: i === highlighted ? "#f0f4ff" : "#fff" }}
              onMouseEnter={() => setHighlighted(i)}>
              <span style={{ fontWeight: 600 }}>{l.name}</span>
              <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{l.brand}</span>
              <span style={{ color: "#aaa", fontSize: 11, marginLeft: 8 }}>{l.units_remaining} uds restantes</span>
            </div>
          )) : <div style={{ padding: "10px 14px", color: "#aaa", fontSize: 13 }}>No se encontró ningún lote</div>}
        </div>
      )}
    </div>
  );
}

function ProductAutocomplete({ products, value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);
  const filtered = products.filter((p) => p.name.toLowerCase().includes(value.toLowerCase()));
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  useEffect(() => { setHighlighted(0); }, [value]);
  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); } }
    else if (e.key === "Escape") setOpen(false);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown}
        placeholder="Ej: Polera Nike talla M azul"
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
      {open && value.length > 0 && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
          {filtered.map((p, i) => (
            <div key={p.id} onMouseDown={() => { onSelect(p); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", background: i === highlighted ? "#f0f4ff" : "#fff" }}
              onMouseEnter={() => setHighlighted(i)}>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyItem = () => ({ product_name: "", quantity: 1, unit_price: "", lot_id: null, lot_input: "" });

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [clientInput, setClientInput] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientPhone, setClientPhone] = useState("");
  const [form, setForm] = useState({ notes: "", items: [emptyItem()] });
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState([]);
  const [productNames, setProductNames] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = () => ordersApi.list().then((r) => setOrders(r.data));

  useEffect(() => {
    load();
    clientsApi.list().then((r) => setClients(r.data));
    lotsApi.list().then((r) => setLots(r.data));
    productsApi.names().then((r) => setProductNames(r.data));
  }, []);

  const handleSelectClient = (c) => { setSelectedClient(c); setClientInput(c.full_name); setClientPhone(""); };
  const handleClientInputChange = (val) => { setClientInput(val); setSelectedClient(null); setClientPhone(""); };
  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => { const items = [...form.items]; items[i] = { ...items[i], [field]: val }; setForm({ ...form, items }); };
  const selectLot = (i, lot) => { const items = [...form.items]; items[i] = { ...items[i], lot_id: lot.id, lot_input: lot.name }; setForm({ ...form, items }); };
  const clearLot = (i) => { const items = [...form.items]; items[i] = { ...items[i], lot_id: null, lot_input: "" }; setForm({ ...form, items }); };

  const handleSubmit = async () => {
    if (!clientInput.trim()) return alert("Ingresa el nombre del cliente");
    setLoading(true);
    try {
      let clientId = selectedClient?.id;
      if (!clientId) {
        const res = await clientsApi.create({ full_name: clientInput.trim(), phone: clientPhone.trim() || null });
        clientId = res.data.id;
        clientsApi.list().then((r) => setClients(r.data));
      }
      await ordersApi.create({
        client_id: clientId,
        notes: form.notes || null,
        items: form.items.map((i) => ({ product_name: i.product_name, quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price), lot_id: i.lot_id || null })),
      });
      setShowForm(false); setClientInput(""); setSelectedClient(null); setClientPhone(""); setForm({ notes: "", items: [emptyItem()] }); load();
    } catch { alert("Error al crear pedido"); } finally { setLoading(false); }
  };

  const filtered = orders.filter((o) => {
    const matchSearch = !search || String(o.id).includes(search) || (o.client?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const orderDate = new Date(o.created_at);
    const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
    const matchTo = !dateTo || orderDate <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const total = form.items.reduce((sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0), 0);
  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const labelStyle = { display: "block", marginBottom: 4, fontWeight: 500, color: "#555", fontSize: 13 };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="#1a1a2e">Pedidos</Typography>
        <Button variant="contained" onClick={() => setShowForm(!showForm)}
          sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
          {showForm ? "Cancelar" : "+ Nuevo pedido"}
        </Button>
      </Box>

      {showForm && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <Typography variant="h6" fontWeight={600} color="#333" mb={2.5}>Registrar nuevo pedido</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2.5 }}>
            <div>
              <label style={labelStyle}>
                Cliente *
                {selectedClient && <span style={{ marginLeft: 8, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>✓ Cliente existente</span>}
                {!selectedClient && clientInput && <span style={{ marginLeft: 8, background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>+ Se creará nuevo</span>}
              </label>
              <ClientAutocomplete clients={clients} value={clientInput} onChange={handleClientInputChange} onSelect={handleSelectClient} />
              {!selectedClient && clientInput && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Celular del cliente</label>
                  <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} style={inputStyle} placeholder="7..." />
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} placeholder="Observaciones del pedido..." />
            </div>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography fontWeight={600} color="#333">Productos</Typography>
            <Button size="small" variant="outlined" onClick={addItem} sx={{ color: "#4f46e5", borderColor: "#4f46e5", borderRadius: 2 }}>+ Agregar ítem</Button>
          </Box>

          <Box sx={{ background: "#f8f9fc", borderRadius: 2, p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {form.items.map((item, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 1.5, alignItems: "end", mb: 1 }}>
                  <div>
                    {i === 0 && <label style={labelStyle}>Descripción del producto</label>}
                    <ProductAutocomplete products={productNames} value={item.product_name} onChange={(val) => updateItem(i, "product_name", val)} onSelect={(p) => updateItem(i, "product_name", p.name)} />
                  </div>
                  <div>
                    {i === 0 && <label style={labelStyle}>Cantidad</label>}
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    {i === 0 && <label style={labelStyle}>Precio (Bs.)</label>}
                    <input type="number" step="0.01" min="0" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} style={inputStyle} placeholder="0.00" />
                  </div>
                  <button onClick={() => removeItem(i)} disabled={form.items.length === 1}
                    style={{ padding: "8px 10px", background: form.items.length === 1 ? "#f5f5f5" : "#fee2e2", color: form.items.length === 1 ? "#ccc" : "#dc2626", border: "none", borderRadius: 6, cursor: form.items.length === 1 ? "not-allowed" : "pointer", marginTop: i === 0 ? 20 : 0 }}>✕</button>
                </Box>
                <div>
                  <label style={{ ...labelStyle, color: "#aaa" }}>
                    Lote
                    {item.lot_id && <span style={{ marginLeft: 8, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>✓ Asociado</span>}
                  </label>
                  <LotAutocomplete lots={lots} value={item.lot_input} onChange={(val) => updateItem(i, "lot_input", val)} onSelect={(lot) => selectLot(i, lot)} onClear={() => clearLot(i)} />
                </div>
              </Paper>
            ))}
          </Box>

          <Box sx={{ borderTop: "1px solid #f0f0f0", pt: 2, mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography>
              <span style={{ color: "#888", fontSize: 13 }}>{form.items.length} ítem(s) — </span>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Total: Bs. {total.toFixed(2)}</span>
            </Typography>
            <Button variant="contained" onClick={handleSubmit}
              disabled={loading || !clientInput || form.items.some((i) => !i.product_name || !i.unit_price)}
              sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2, opacity: loading || !clientInput ? 0.6 : 1 }}>
              {loading ? "Guardando..." : "Registrar pedido"}
            </Button>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" placeholder="Buscar por cliente o # pedido..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ width: 240 }} />
        <TextField select size="small" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ width: 180 }}>
          <MenuItem value="all">Todos los estados</MenuItem>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
        <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
        {(search || statusFilter !== "all" || dateFrom || dateTo) && (
          <Button size="small" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setPage(0); }}
            sx={{ color: "#666" }}>Limpiar</Button>
        )}
        <Typography variant="caption" color="text.secondary">{filtered.length} resultado(s)</Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#f8f9fc" }}>
              {["#", "Cliente", "Ítems", "Total", "Estado", "Fecha"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#888", fontSize: 13 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((o) => {
              const s = STATUS_LABELS[o.status] || { label: o.status, color: "#888" };
              return (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: "#666" }}>#{o.id}</TableCell>
                  <TableCell>{o.client?.full_name}</TableCell>
                  <TableCell sx={{ color: "#666", fontSize: 13 }}>{o.items?.length || 0} ítem(s)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  </TableCell>
                  <TableCell sx={{ color: "#888", fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString("es-BO")}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#aaa" }}>
                  {search || statusFilter !== "all" || dateFrom || dateTo ? "No se encontraron pedidos" : "No hay pedidos registrados"}
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