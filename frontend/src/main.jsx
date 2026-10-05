import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
// Icons are bundled locally (no CDN), so they render even where external web fonts are blocked
import '@fortawesome/fontawesome-free/css/all.min.css';
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
