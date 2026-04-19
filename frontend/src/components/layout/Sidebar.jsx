import { NavLink } from "react-router-dom";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: DashboardRoundedIcon, exact: true },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBagRoundedIcon },
  { to: "/lotes", label: "Lotes", icon: Inventory2RoundedIcon },
  { to: "/pagos", label: "Pagos", icon: CreditCardRoundedIcon },
  { to: "/logistica", label: "Logística", icon: LocalShippingRoundedIcon },
  { to: "/clientes", label: "Clientes", icon: GroupRoundedIcon },
  { to: "/productos", label: "Ventas", icon: PointOfSaleRoundedIcon },
];

function SidebarContent({ onItemClick }) {
  const { user } = useAuth();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#1a1a2e",
        color: "#ffffff",
      }}
    >
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography fontWeight={800} fontSize={18} lineHeight={1.1}>
          LiveSale
        </Typography>
        <Typography color="rgba(255,255,255,0.6)" fontSize={12} mt={0.5}>
          Manager
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      <List sx={{ px: 1.25, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to={item.to}
                end={item.exact}
                onClick={onItemClick}
                sx={{
                  borderRadius: 2,
                  color: "rgba(255,255,255,0.75)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.08)",
                    color: "#ffffff",
                  },
                  "&.active": {
                    bgcolor: "rgba(79,70,229,0.35)",
                    color: "#ffffff",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                    minWidth: 36,
                  },
                }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography color="rgba(255,255,255,0.65)" fontSize={12} noWrap>
          {user?.full_name || "Usuario"}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Sidebar({ drawerWidth, isMobile, mobileOpen, onMobileClose }) {
  return (
    <>
      <Drawer
        variant="temporary"
        open={isMobile && mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "none",
          },
        }}
      >
        <SidebarContent onItemClick={onMobileClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "none",
          },
        }}
      >
        <SidebarContent />
      </Drawer>
    </>
  );
}