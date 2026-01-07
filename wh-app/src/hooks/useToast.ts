import { useState, useCallback } from 'react';
import { ToastType } from '../components/common/Toast';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
    duration: 3000,
  });

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', duration: number = 3000) => {
      setToast({
        visible: true,
        message,
        type,
        duration,
      });
    },
    [],
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'success', duration);
    },
    [showToast],
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'error', duration);
    },
    [showToast],
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'warning', duration);
    },
    [showToast],
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'info', duration);
    },
    [showToast],
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    toast,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
  };
};
