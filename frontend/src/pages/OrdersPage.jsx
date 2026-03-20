import { useState, useEffect, useRef } from "react";
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

function Badge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: "#888" };
  return (
    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function ClientAutocomplete({ clients, value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(value.toLowerCase())
  );

  const exactMatch = clients.find(
    (c) => c.full_name.toLowerCase() === value.toLowerCase()
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setHighlighted(0); }, [value]);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = filtered[highlighted] || (exactMatch ? exactMatch : null);
      if (selected) { onSelect(selected); setOpen(false); }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Escribir nombre del cliente..."
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
      />
      {open && value.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
          {filtered.length > 0 ? (
            filtered.map((c, i) => (
              <div
                key={c.id}
                onMouseDown={() => { onSelect(c); setOpen(false); }}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", background: i === highlighted ? "#f0f4ff" : "#fff" }}
                onMouseEnter={() => setHighlighted(i)}
              >
                <span style={{ fontWeight: 600 }}>{c.full_name}</span>
                {c.phone && <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{c.phone}</span>}
              </div>
            ))
          ) : (
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

  const filtered = lots.filter((l) =>
    l.name.toLowerCase().includes(value.toLowerCase()) ||
    l.brand.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setHighlighted(0); }, [value]);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Sin lote (opcional)"
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
        />
        {value && (
          <button
            onMouseDown={onClear}
            style={{ padding: "6px 10px", background: "#f0f0f0", border: "none", borderRadius: 6, cursor: "pointer", color: "#888", fontSize: 13 }}
          >
            ✕
          </button>
        )}
      </div>
      {open && value.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
          {filtered.length > 0 ? (
            filtered.map((l, i) => (
              <div
                key={l.id}
                onMouseDown={() => { onSelect(l); setOpen(false); }}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", background: i === highlighted ? "#f0f4ff" : "#fff" }}
                onMouseEnter={() => setHighlighted(i)}
              >
                <span style={{ fontWeight: 600 }}>{l.name}</span>
                <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{l.brand}</span>
                <span style={{ color: "#aaa", fontSize: 11, marginLeft: 8 }}>{l.units_remaining} uds restantes</span>
              </div>
            ))
          ) : (
            <div style={{ padding: "10px 14px", color: "#aaa", fontSize: 13 }}>
              No se encontró ningún lote
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductAutocomplete({ products, value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setHighlighted(0); }, [value]);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Ej: Polera Nike talla M azul"
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
      />
      {open && value.length > 0 && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => { onSelect(p); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", background: i === highlighted ? "#f0f4ff" : "#fff" }}
              onMouseEnter={() => setHighlighted(i)}
            >
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

  const load = () => ordersApi.list().then((r) => setOrders(r.data));

  useEffect(() => {
    load();
    clientsApi.list().then((r) => setClients(r.data));
    lotsApi.list().then((r) => setLots(r.data));
    productsApi.names().then((r) => setProductNames(r.data));
  }, []);

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setClientInput(c.full_name);
    setClientPhone("");
  };

  const handleClientInputChange = (val) => {
    setClientInput(val);
    setSelectedClient(null);
    setClientPhone("");
  };

  const addItem = () =>
    setForm({ ...form, items: [...form.items, emptyItem()] });

  const removeItem = (i) =>
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const updateItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm({ ...form, items });
  };

  const selectLot = (i, lot) => {
    const items = [...form.items];
    items[i] = { ...items[i], lot_id: lot.id, lot_input: lot.name };
    setForm({ ...form, items });
  };

  const clearLot = (i) => {
    const items = [...form.items];
    items[i] = { ...items[i], lot_id: null, lot_input: "" };
    setForm({ ...form, items });
  };

  const handleSubmit = async () => {
    if (!clientInput.trim()) return alert("Ingresa el nombre del cliente");
    setLoading(true);
    try {
      let clientId = selectedClient?.id;

      if (!clientId) {
        const res = await clientsApi.create({
          full_name: clientInput.trim(),
          phone: clientPhone.trim() || null,
        });
        clientId = res.data.id;
        clientsApi.list().then((r) => setClients(r.data));
      }

      await ordersApi.create({
        client_id: clientId,
        notes: form.notes || null,
        items: form.items.map((i) => ({
          product_name: i.product_name,
          quantity: parseInt(i.quantity),
          unit_price: parseFloat(i.unit_price),
          lot_id: i.lot_id || null,
        })),
      });

      setShowForm(false);
      setClientInput("");
      setSelectedClient(null);
      setClientPhone("");
      setForm({ notes: "", items: [emptyItem()] });
      load();
    } catch {
      alert("Error al crear pedido");
    } finally {
      setLoading(false);
    }
  };

  const total = form.items.reduce(
    (sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0),
    0
  );

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };
  const labelStyle = { display: "block", marginBottom: 4, fontWeight: 500, color: "#555", fontSize: 13 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Pedidos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showForm ? "Cancelar" : "+ Nuevo pedido"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20, color: "#333" }}>Registrar nuevo pedido</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>
                Cliente *
                {selectedClient && (
                  <span style={{ marginLeft: 8, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                  </span>
                )}
                {!selectedClient && clientInput && (
                  <span style={{ marginLeft: 8, background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                    + Se creará nuevo
                  </span>
                )}
              </label>
              <ClientAutocomplete
                clients={clients}
                value={clientInput}
                onChange={handleClientInputChange}
                onSelect={handleSelectClient}
              />
              {!selectedClient && clientInput && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>
                    Celular del cliente
                  </label>
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    style={inputStyle}
                    placeholder="7..."
                  />
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={inputStyle}
                placeholder="Observaciones del pedido..."
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontWeight: 600, color: "#333", fontSize: 14 }}>Productos</label>
              <button
                onClick={addItem}
                style={{ padding: "5px 14px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                + Agregar ítem
              </button>
            </div>

            <div style={{ background: "#f8f9fc", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {form.items.map((item, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #eee" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 8 }}>
                    <div>
                      {i === 0 && <label style={labelStyle}>Descripción del producto</label>}
                      <ProductAutocomplete
                        products={productNames}
                        value={item.product_name}
                        onChange={(val) => updateItem(i, "product_name", val)}
                        onSelect={(p) => updateItem(i, "product_name", p.name)}
                      />
                    </div>
                    <div>
                      {i === 0 && <label style={labelStyle}>Cantidad</label>}
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      {i === 0 && <label style={labelStyle}>Precio (Bs.)</label>}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                        style={inputStyle}
                        placeholder="0.00"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      disabled={form.items.length === 1}
                      style={{
                        padding: "8px 10px",
                        background: form.items.length === 1 ? "#f5f5f5" : "#fee2e2",
                        color: form.items.length === 1 ? "#ccc" : "#dc2626",
                        border: "none",
                        borderRadius: 6,
                        cursor: form.items.length === 1 ? "not-allowed" : "pointer",
                        marginTop: i === 0 ? 20 : 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#aaa" }}>
                      Lote
                      {item.lot_id && (
                        <span style={{ marginLeft: 8, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                          ✓ Asociado
                        </span>
                      )}
                    </label>
                    <LotAutocomplete
                      lots={lots}
                      value={item.lot_input}
                      onChange={(val) => updateItem(i, "lot_input", val)}
                      onSelect={(lot) => selectLot(i, lot)}
                      onClear={() => clearLot(i)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ color: "#888", fontSize: 13 }}>{form.items.length} ítem(s) — </span>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Total: Bs. {total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !clientInput || form.items.some((i) => !i.product_name || !i.unit_price)}
              style={{
                padding: "10px 28px",
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                opacity: loading || !clientInput ? 0.6 : 1,
              }}
            >
              {loading ? "Guardando..." : "Registrar pedido"}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["#", "Cliente", "Ítems", "Total", "Estado", "Fecha"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "12px", color: "#666", fontWeight: 600 }}>#{o.id}</td>
                <td style={{ padding: "12px" }}>{o.client?.full_name}</td>
                <td style={{ padding: "12px", color: "#666", fontSize: 13 }}>{o.items?.length || 0} ítem(s)</td>
                <td style={{ padding: "12px", fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</td>
                <td style={{ padding: "12px" }}><Badge status={o.status} /></td>
                <td style={{ padding: "12px", color: "#888", fontSize: 13 }}>
                  {new Date(o.created_at).toLocaleDateString("es-BO")}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#aaa" }}>
                  No hay pedidos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}