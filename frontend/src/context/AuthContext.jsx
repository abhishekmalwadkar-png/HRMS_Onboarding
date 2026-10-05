import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mangohrms_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role === 'hr') return parsed;
      }
      // Default to HR Administrator
      const defaultHR = {
        role: 'hr',
        name: 'Pooja Deshmukh (HR Operations Director)',
        email: 'pooja.deshmukh@mangohrms.com',
        avatar: 'P',
        badge: 'HR Administrator'
      };
      localStorage.setItem('mangohrms_user', JSON.stringify(defaultHR));
      return defaultHR;
    } catch {
      return {
        role: 'hr',
        name: 'Pooja Deshmukh (HR Operations Director)',
        email: 'pooja.deshmukh@mangohrms.com',
        avatar: 'P',
        badge: 'HR Administrator'
      };
    }
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mangohrms_theme');
    if (saved) return saved;
    // First visit: follow the operating system's light/dark preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mangohrms_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loginAs = (role = 'hr', email, name) => {
    const userObj = {
      role: 'hr',
      name: name || 'Pooja Deshmukh (HR Operations Director)',
      email: email || 'pooja.deshmukh@mangohrms.com',
      avatar: 'P',
      badge: 'HR Administrator'
    };

    setCurrentUser(userObj);
    localStorage.setItem('mangohrms_user', JSON.stringify(userObj));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mangohrms_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, loginAs, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
