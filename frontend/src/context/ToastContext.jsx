import React, { createContext, useContext, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  // Global popup notifications disabled as requested
  const showToast = useCallback(() => {}, []);
  const removeToast = useCallback(() => {}, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
