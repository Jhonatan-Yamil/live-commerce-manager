import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";

export default function MainLayout() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "32px 36px", background: "#f8f9fc", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}