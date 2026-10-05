import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* reducedMotion="user": transforms are skipped when the OS "reduce motion" setting is on */}
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  </React.StrictMode>
);
