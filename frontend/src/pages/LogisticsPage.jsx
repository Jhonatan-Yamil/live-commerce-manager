import { Box, Typography } from "@mui/material";
import PrepareDeliveryMode from "../components/logistics/PrepareDeliveryMode";
import DeliveriesTodayPanel from "../components/logistics/DeliveriesTodayPanel";
import ScheduledDeliveriesPanel from "../components/logistics/ScheduledDeliveriesPanel";
import useLogisticsData from "../hooks/useLogisticsData";
import { useAuth } from "../context/AuthContext";
import { getBackendOrigin } from "../services/api";
import { APP_PALETTE } from "../theme/palette";

export default function LogisticsPage() {
  const { user } = useAuth();
  const { logistics, orders, load } = useLogisticsData();

  const brandLogoUrl = user?.logo_path
    ? `${getBackendOrigin()}${String(user.logo_path).startsWith("/") ? user.logo_path : `/${user.logo_path}`}`
    : "";

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color={APP_PALETTE.text.primary}>
          Entregas
        </Typography>
      </Box>

      <DeliveriesTodayPanel orders={orders} logistics={logistics} onUpdate={load} brandLogoUrl={brandLogoUrl} />
      <PrepareDeliveryMode orders={orders} logistics={logistics} onUpdate={load} />
      <ScheduledDeliveriesPanel orders={orders} onUpdate={load} brandLogoUrl={brandLogoUrl} />
    </Box>
  );
}

