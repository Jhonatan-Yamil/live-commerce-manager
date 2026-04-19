import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import PaymentsPage from "./pages/PaymentsPage";
import LogisticsPage from "./pages/LogisticsPage";
import ClientsPage from "./pages/ClientsPage";
import ProductsPage from "./pages/ProductsPage";
import LotsPage from "./pages/LotsPage";
import { NotificationProvider } from "./context/NotificationContext";

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pedidos" element={<OrdersPage />} />
              <Route path="/pagos" element={<PaymentsPage />} />
              <Route path="/logistica" element={<LogisticsPage />} />
              <Route path="/clientes" element={<ClientsPage />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/lotes" element={<LotsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}