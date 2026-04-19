import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const notify = useCallback((message, severity = "info") => {
    setNotification({ open: true, message, severity });
  }, []);

  const closeNotification = useCallback((_, reason) => {
    if (reason === "clickaway") return;
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo(
    () => ({
      notify,
      notifySuccess: (message) => notify(message, "success"),
      notifyError: (message) => notify(message, "error"),
      notifyWarning: (message) => notify(message, "warning"),
      notifyInfo: (message) => notify(message, "info"),
    }),
    [notify]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={3500}
        onClose={closeNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
