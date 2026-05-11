import { createTheme } from "@mui/material/styles";
import { APP_PALETTE } from "./palette";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: APP_PALETTE.background,
      paper: APP_PALETTE.surface,
    },
    text: {
      primary: APP_PALETTE.text.primary,
      secondary: APP_PALETTE.text.secondary,
      disabled: APP_PALETTE.text.muted,
    },
    primary: {
      main: APP_PALETTE.brand.primary,
      dark: APP_PALETTE.brand.primaryHover,
      light: APP_PALETTE.brand.soft,
      contrastText: APP_PALETTE.surface,
    },
    secondary: {
      main: APP_PALETTE.brand.secondary,
      dark: APP_PALETTE.brand.secondaryHover,
      light: APP_PALETTE.brand.soft,
      contrastText: APP_PALETTE.text.primary,
    },
    success: {
      main: APP_PALETTE.status.success,
      light: APP_PALETTE.surfaces.successSoft,
      dark: APP_PALETTE.status.success,
      contrastText: APP_PALETTE.surface,
    },
    warning: {
      main: APP_PALETTE.status.warning,
      light: APP_PALETTE.surfaces.warningSoft,
      dark: APP_PALETTE.status.warning,
      contrastText: APP_PALETTE.text.primary,
    },
    error: {
      main: APP_PALETTE.status.error,
      light: APP_PALETTE.surfaces.errorSoft,
      dark: APP_PALETTE.status.error,
      contrastText: APP_PALETTE.surface,
    },
    info: {
      main: APP_PALETTE.status.info,
      light: APP_PALETTE.surfaces.infoSoft,
      dark: APP_PALETTE.status.info,
      contrastText: APP_PALETTE.surface,
    },
    divider: APP_PALETTE.surfaces.border,
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: ["Inter", "system-ui", "sans-serif"].join(","),
    h5: {
      fontWeight: 700,
      color: APP_PALETTE.text.primary,
    },
    h6: {
      fontWeight: 600,
      color: APP_PALETTE.text.primary,
    },
    body1: {
      color: APP_PALETTE.text.secondary,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: APP_PALETTE.background,
          color: APP_PALETTE.text.primary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});