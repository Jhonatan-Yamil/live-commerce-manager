import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box, Button, TextField, Typography, Paper, Alert, CircularProgress,
} from "@mui/material";
import { APP_PALETTE } from "../theme/palette";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: APP_PALETTE.background }}>
      <Paper sx={{ p: 5, borderRadius: 3, width: 380, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <Typography variant="h5" fontWeight={700} color={APP_PALETTE.text.primary} textAlign="center" mb={0.5}>
          LiveSale Manager
        </Typography>
        <Typography color="text.secondary" textAlign="center" fontSize={14} mb={3}>
          Panel de gestión de ventas
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label={submitAttempted ? "Email *" : "Email"}
            type="email"
            fullWidth
            size="small"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label={submitAttempted ? "Contraseña *" : "Contraseña"}
            type="password"
            fullWidth
            size="small"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ py: 1.5, background: APP_PALETTE.brand.primary, "&:hover": { background: APP_PALETTE.brand.primaryHover }, borderRadius: 2, fontSize: 15, fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : "Ingresar"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}