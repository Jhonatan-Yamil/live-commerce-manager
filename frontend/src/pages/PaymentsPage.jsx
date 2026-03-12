import { useState, useEffect } from "react";
import { paymentsApi } from "../services/api";

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "#f59e0b", next: ["in_review"] },
  in_review: { label: "En revisión", color: "#3b82f6", next: ["confirmed", "rejected"] },
  confirmed: { label: "Confirmado", color: "#10b981", next: [] },
  rejected: { label: "Rechazado", color: "#ef4444", next: ["in_review"] },
};

const STATUS_LABELS_NEXT = {
  in_review: "Marcar en revisión",
  confirmed: "Confirmar pago ✓",
  rejected: "Rechazar pago ✗",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [vouchers, setVouchers] = useState({});
  const [notes, setNotes] = useState({});

  const load = () => paymentsApi.list().then((r) => setPayments(r.data));
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    await paymentsApi.updateStatus(id, { status, notes: notes[id] || null });
    load();
  };

  const uploadVoucher = async (orderId) => {
    const path = vouchers[orderId];
    if (!path) return alert("Ingresa la referencia del comprobante");
    await paymentsApi.uploadVoucher(orderId, path);
    load();
  };

  const inputStyle = {
    padding: "6px 10px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    width: "100%",
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24, color: "#1a1a2e" }}>Gestión de Pagos</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {payments.map((p) => {
          const s = STATUS_CONFIG[p.status];
          return (
            <div
              key={p.id}
              style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.color}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 4 }}>
                    Pedido #{p.order_id}
                    <span style={{ marginLeft: 12, background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                      {s.label}
                    </span>
                  </div>
                  {p.voucher_path && (
                    <div style={{ fontSize: 13, color: "#666" }}>
                      Comprobante: <strong>{p.voucher_path}</strong>
                    </div>
                  )}
                  {p.notes && (
                    <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Nota: {p.notes}</div>
                  )}
                  {p.reviewed_at && (
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                      Revisado: {new Date(p.reviewed_at).toLocaleString("es-BO")}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
                  {p.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        placeholder="Referencia del comprobante"
                        value={vouchers[p.order_id] || ""}
                        onChange={(e) => setVouchers({ ...vouchers, [p.order_id]: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => uploadVoucher(p.order_id)}
                        style={{ padding: "6px 12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
                      >
                        Registrar
                      </button>
                    </div>
                  )}
                  {s.next.length > 0 && (
                    <div>
                      <input
                        placeholder="Notas (opcional)"
                        value={notes[p.id] || ""}
                        onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })}
                        style={{ ...inputStyle, marginBottom: 6 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        {s.next.map((ns) => {
                          const colors = { confirmed: "#10b981", rejected: "#ef4444", in_review: "#3b82f6" };
                          return (
                            <button
                              key={ns}
                              onClick={() => changeStatus(p.id, ns)}
                              style={{ flex: 1, padding: "7px", background: colors[ns], color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                            >
                              {STATUS_LABELS_NEXT[ns]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {payments.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", color: "#aaa" }}>
            No hay pagos registrados
          </div>
        )}
      </div>
    </div>
  );
}