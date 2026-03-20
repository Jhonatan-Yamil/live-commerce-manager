import { useState, useEffect } from "react";
import { productsApi } from "../services/api";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    productsApi.sold().then((r) => {
      setProducts(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0);
  const totalUnits = products.reduce((sum, p) => sum + p.units_sold, 0);

  const toggleExpand = (id) => setExpanded({ ...expanded, [id]: !expanded[id] });

  return (
    <div>
      <h2 style={{ marginBottom: 6, color: "#1a1a2e" }}>Historial de productos vendidos</h2>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
        Resumen de todos los productos registrados en pedidos
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Productos distintos", value: products.length, icon: "🏷️", color: "#4f46e5" },
          { label: "Unidades vendidas", value: totalUnits, icon: "📦", color: "#0891b2" },
          { label: "Ingresos totales", value: `Bs. ${totalRevenue.toFixed(2)}`, icon: "💰", color: "#059669" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            style={{ width: 280, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
          />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["Producto", "Unidades vendidas", "Pedidos", "Precio promedio", "Ingresos generados", "Lotes"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#aaa" }}>Cargando...</td></tr>
            ) : filtered.length > 0 ? (
              filtered.map((p) => (
                <>
                  <tr key={p.product_id} style={{ borderBottom: expanded[p.product_id] ? "none" : "1px solid #f5f5f5" }}>
                    <td style={{ padding: "12px", fontWeight: 600, color: "#1a1a2e" }}>{p.name}</td>
                    <td style={{ padding: "12px", color: "#4f46e5", fontWeight: 600 }}>{p.units_sold} uds</td>
                    <td style={{ padding: "12px", color: "#666" }}>{p.orders_count} pedido(s)</td>
                    <td style={{ padding: "12px", color: "#666" }}>Bs. {p.avg_price.toFixed(2)}</td>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#059669" }}>Bs. {p.total_revenue.toFixed(2)}</td>
                    <td style={{ padding: "12px" }}>
                      {p.lots.length > 0 ? (
                        <button
                          onClick={() => toggleExpand(p.product_id)}
                          style={{ padding: "4px 10px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >
                          {expanded[p.product_id] ? "▲ Ocultar" : `▼ Ver ${p.lots.length} lote(s)`}
                        </button>
                      ) : (
                        <span style={{ color: "#aaa", fontSize: 12 }}>Sin lote</span>
                      )}
                    </td>
                  </tr>
                  {expanded[p.product_id] && p.lots.map((l) => (
                    <tr key={l.lot_id} style={{ borderBottom: "1px solid #f5f5f5", background: "#f8f9fc" }}>
                      <td style={{ padding: "8px 12px 8px 28px", color: "#666", fontSize: 13 }}>
                        └ <span style={{ fontWeight: 600 }}>{l.lot_name}</span>
                        <span style={{ marginLeft: 6, color: "#aaa" }}>{l.brand}</span>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#4f46e5", fontSize: 13 }}>{l.units_sold} uds</td>
                      <td style={{ padding: "8px 12px", color: "#aaa", fontSize: 13 }}>—</td>
                      <td style={{ padding: "8px 12px", color: "#aaa", fontSize: 13 }}>—</td>
                      <td style={{ padding: "8px 12px", color: "#059669", fontSize: 13, fontWeight: 600 }}>Bs. {l.revenue.toFixed(2)}</td>
                      <td style={{ padding: "8px 12px" }}></td>
                    </tr>
                  ))}
                </>
              ))
            ) : (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#aaa" }}>
                {search ? "No se encontraron productos" : "No hay productos vendidos aún"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}