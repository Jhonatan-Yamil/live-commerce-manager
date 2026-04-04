import { useEffect, useState } from "react";
import {
  Box, Button,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography,
} from "@mui/material";
import { ordersApi, clientsApi, lotsApi, productsApi } from "../services/api";
import SearchBar from "../components/common/SearchBar";
import StatusBadge from "../components/common/StatusBadge";
import TablePager from "../components/common/TablePager";
import OrderForm from "../components/orders/OrderForm";
import { ORDER_STATUS_LABELS } from "../utils/constants";

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
  }).sort((a, b) => b.id - a.id);

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const searchFilters = [
    {
      key: "status",
      type: "select",
      label: "Estado",
      value: statusFilter,
      defaultValue: "all",
      onChange: (value) => {
        setStatusFilter(value);
        setPage(0);
      },
      options: [{ value: "all", label: "Todos los estados" }, ...statusOptions],
    },
    {
      key: "from",
      type: "date",
      label: "Desde",
      value: dateFrom,
      defaultValue: "",
      onChange: (value) => {
        setDateFrom(value);
        setPage(0);
      },
    },
    {
      key: "to",
      type: "date",
      label: "Hasta",
      value: dateTo,
      defaultValue: "",
      onChange: (value) => {
        setDateTo(value);
        setPage(0);
      },
    },
  ];

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
        <OrderForm
          clients={clients}
          lots={lots}
          productNames={productNames}
          clientInput={clientInput}
          selectedClient={selectedClient}
          clientPhone={clientPhone}
          form={form}
          loading={loading}
          onClientInputChange={handleClientInputChange}
          onSelectClient={handleSelectClient}
          onClientPhoneChange={setClientPhone}
          onFormNotesChange={(value) => setForm({ ...form, notes: value })}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onSelectLot={selectLot}
          onClearLot={clearLot}
          onSubmit={handleSubmit}
        />
      )}

      <SearchBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        filters={searchFilters}
        resultCount={filtered.length}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
          setDateFrom("");
          setDateTo("");
          setPage(0);
        }}
      />

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
              const s = ORDER_STATUS_LABELS[o.status] || { label: o.status, color: "#888" };
              return (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: "#666" }}>#{o.id}</TableCell>
                  <TableCell>{o.client?.full_name}</TableCell>
                  <TableCell sx={{ color: "#666", fontSize: 13 }}>{o.items?.length || 0} ítem(s)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</TableCell>
                  <TableCell><StatusBadge label={s.label} color={s.color} /></TableCell>
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
        <TablePager
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );
}