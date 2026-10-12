import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mangohrms_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // Explicitly ensure user is Jessica Miller
          if (parsed.name?.includes('Pooja') || parsed.name?.includes('Deshmukh') || parsed.email?.includes('pooja')) {
            parsed.name = 'Jessica Miller (HR Operations Director)';
            parsed.email = 'jessica.miller@automationedge.ai';
            parsed.avatar = 'J';
            parsed.badge = 'HR Administrator';
            localStorage.setItem('mangohrms_user', JSON.stringify(parsed));
          }
          if (parsed.role === 'hr') return parsed;
        }
      }
      // Default to HR Administrator
      const defaultHR = {
        role: 'hr',
        name: 'Jessica Miller (HR Operations Director)',
        email: 'jessica.miller@automationedge.ai',
        avatar: 'J',
        badge: 'HR Administrator'
      };
      localStorage.setItem('mangohrms_user', JSON.stringify(defaultHR));
      return defaultHR;
    } catch {
      return {
        role: 'hr',
        name: 'Jessica Miller (HR Operations Director)',
        email: 'jessica.miller@automationedge.ai',
        avatar: 'J',
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
    let cleanName = name || 'Jessica Miller (HR Operations Director)';
    if (cleanName.includes('Pooja') || cleanName.includes('Deshmukh')) {
      cleanName = 'Jessica Miller (HR Operations Director)';
    }
    const userObj = {
      role: 'hr',
      name: cleanName,
      email: email || 'jessica.miller@automationedge.ai',
      avatar: 'J',
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
