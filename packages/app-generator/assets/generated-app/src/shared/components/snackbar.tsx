import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

interface Notification {
  message: string;
  severity: AlertColor;
}

interface SnackbarContextValue {
  notify: (message: string, severity?: AlertColor) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({ notify: () => undefined });

export function SnackbarProvider(props: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);

  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    setNotification({ message, severity });
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <SnackbarContext.Provider value={value}>
      {props.children}
      <Snackbar
        open={notification !== null}
        autoHideDuration={4000}
        // ignore clickaway events, only timeout or explicit close dismisses the message
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') {
            setNotification(null);
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert
            severity={notification.severity}
            variant="filled"
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  return useContext(SnackbarContext);
}
