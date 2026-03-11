import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", exact: true },
  { to: "/pedidos", label: "Pedidos", icon: "📦" },
  { to: "/pagos", label: "Pagos", icon: "💳" },
  { to: "/logistica", label: "Logística", icon: "🚚" },
  { to: "/clientes", label: "Clientes", icon: "👥" },
  { to: "/productos", label: "Productos", icon: "🏷️" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "#1a1a2e", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>LiveSale</div>
        <div style={{ color: "#8b8fa8", fontSize: 12, marginTop: 2 }}>Manager</div>
      </div>
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              color: isActive ? "#fff" : "#8b8fa8",
              background: isActive ? "rgba(79,70,229,0.3)" : "transparent",
              textDecoration: "none",
              fontSize: 14,
              borderLeft: isActive ? "3px solid #4f46e5" : "3px solid transparent",
              transition: "all 0.15s",
            })}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "#8b8fa8", fontSize: 12, marginBottom: 8 }}>{user?.full_name}</div>
        <button
          onClick={logout}
          style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.06)", color: "#8b8fa8", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}