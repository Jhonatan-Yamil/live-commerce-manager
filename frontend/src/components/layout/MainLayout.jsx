import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRef, useState } from "react";
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import Sidebar from "./Sidebar";
import { APP_PALETTE } from "../../theme/palette";
import { useNotification } from "../../context/NotificationContext";
import { usersApi } from "../../services/api";

export default function MainLayout() {
  const { user, loading, logout, updateUser } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoInputRef = useRef(null);

  const drawerWidth = 260;

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const res = await usersApi.uploadLogo(file);
      updateUser({ ...user, ...res.data });
      notifySuccess("Logo actualizado");
    } catch {
      notifyError("No se pudo subir el logo");
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: APP_PALETTE.background }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: APP_PALETTE.surface,
          color: APP_PALETTE.text.primary,
          borderBottom: `1px solid ${APP_PALETTE.surfaces.border}`,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, px: { xs: 2, sm: 3 } }}>
          {isMobile && (
            <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 1, color: APP_PALETTE.text.primary }}>
              <MenuRoundedIcon />
            </IconButton>
          )}

          <Typography variant="h6" fontWeight={900} sx={{ flexGrow: 1, fontSize: { xs: 18, md: 20 }, color: APP_PALETTE.text.primary, letterSpacing: 0.15 }}>
            LiveSale Manager
          </Typography>

          <Typography
            sx={{
              display: { xs: "none", sm: "block" },
              mr: 2,
              color: APP_PALETTE.text.secondary,
              fontSize: 14,
              maxWidth: 260,
              fontWeight: 700,
            }}
            noWrap
          >
            {user?.full_name}
          </Typography>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleLogoUpload}
          />

          <Button
            variant="outlined"
            startIcon={<UploadFileRoundedIcon />}
            onClick={() => logoInputRef.current?.click()}
            sx={{
              mr: 1,
              borderRadius: 999,
              px: 1.5,
              textTransform: "none",
              fontWeight: 700,
              borderColor: APP_PALETTE.surfaces.border,
              color: APP_PALETTE.text.primary,
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Logo
            </Box>
          </Button>

          <Button
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
            sx={{
              borderRadius: 999,
              px: 1.75,
              textTransform: "none",
              fontWeight: 600,
              minWidth: "auto",
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Cerrar sesión
            </Box>
          </Button>
        </Toolbar>
      </AppBar>

      <Sidebar
        drawerWidth={drawerWidth}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerClose}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }} />
        <Box
          key={user?.id ?? "guest"}
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
            maxWidth: 1600,
            mx: "auto",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}