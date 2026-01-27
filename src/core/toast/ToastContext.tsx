import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Slide from '@mui/material/Slide';
import type { SlideProps } from '@mui/material/Slide';

type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  message: string;
  severity?: ToastSeverity;
  duration?: number;
  action?: ReactNode;
}

interface Toast extends ToastOptions {
  id: string;
  severity: ToastSeverity;
  duration: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const toast = useCallback((options: ToastOptions): string => {
    const id = generateId();
    const newToast: Toast = {
      id,
      message: options.message,
      title: options.title,
      severity: options.severity ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, [generateId]);

  const success = useCallback((message: string, title?: string): string => {
    return toast({ message, title, severity: 'success' });
  }, [toast]);

  const error = useCallback((message: string, title?: string): string => {
    return toast({ message, title, severity: 'error', duration: 8000 });
  }, [toast]);

  const warning = useCallback((message: string, title?: string): string => {
    return toast({ message, title, severity: 'warning' });
  }, [toast]);

  const info = useCallback((message: string, title?: string): string => {
    return toast({ message, title, severity: 'info' });
  }, [toast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const handleClose = useCallback((id: string) => (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    dismiss(id);
  }, [dismiss]);

  const contextValue: ToastContextValue = {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.map((t, index) => (
        <Snackbar
          key={t.id}
          open
          autoHideDuration={t.duration}
          onClose={handleClose(t.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            bottom: { xs: 24 + index * 72, sm: 24 + index * 72 },
          }}
        >
          <Alert
            severity={t.severity}
            onClose={handleClose(t.id)}
            variant="filled"
            action={t.action}
            sx={{
              width: '100%',
              minWidth: 300,
              maxWidth: 450,
              boxShadow: 3,
              '& .MuiAlert-message': {
                flex: 1,
              },
            }}
          >
            {t.title && <AlertTitle sx={{ fontWeight: 600 }}>{t.title}</AlertTitle>}
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
