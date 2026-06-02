import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsPhoneRoundedIcon from "@mui/icons-material/SettingsPhoneRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import Sidebar from "./Sidebar";
import { APP_PALETTE } from "../../theme/palette";
import { getBackendOrigin } from "../../services/api";
import ProfileDialog from "../account/ProfileDialog";
import WhatsAppQuickDialog from "../account/WhatsAppQuickDialog";

function resolveAvatarSrc(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getBackendOrigin()}${path}`;
}

export default function MainLayout() {
  const { user, loading, logout, updateUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const drawerWidth = 260;
  const isMenuOpen = Boolean(menuAnchorEl);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleOpenProfile = () => {
    handleCloseMenu();
    setProfileOpen(true);
  };

  const handleOpenWhatsApp = () => {
    handleCloseMenu();
    setWhatsappOpen(true);
  };

  const handleLogout = () => {
    handleCloseMenu();
    logout();
  };

  const hasLogo = Boolean(user?.logo_path);

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
            OperaFlow
          </Typography>

          <IconButton
            onClick={handleOpenMenu}
            sx={{
              ml: 1,
              border: `1px solid ${APP_PALETTE.surfaces.border}`,
              bgcolor: APP_PALETTE.surface,
            }}
          >
            <Avatar
              src={resolveAvatarSrc(user?.logo_path)}
              sx={{ width: 34, height: 34, bgcolor: APP_PALETTE.brand.primary, fontWeight: 900 }}
            >
              {!hasLogo ? <PersonRoundedIcon fontSize="small" /> : null}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={menuAnchorEl}
            open={isMenuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { minWidth: 260, borderRadius: 2.5, mt: 1 } }}
          >
            <Box sx={{ px: 1.75, pt: 1.25, pb: 0.8 }}>
              <Typography fontWeight={800} color={APP_PALETTE.text.primary} noWrap>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color={APP_PALETTE.text.secondary} noWrap>
                {user?.email}
              </Typography>
            </Box>
            <MenuItem onClick={handleOpenProfile}>
              <ListItemIcon>
                <ManageAccountsRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Editar perfil</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleOpenWhatsApp}>
              <ListItemIcon>
                <SettingsPhoneRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>WhatsApp</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{ color: APP_PALETTE.status.error, "& .MuiListItemIcon-root": { color: APP_PALETTE.status.error } }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Cerrar sesion</ListItemText>
            </MenuItem>
          </Menu>
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

      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        updateUser={updateUser}
      />
      <WhatsAppQuickDialog
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        user={user}
        updateUser={updateUser}
      />
    </Box>
  );
}