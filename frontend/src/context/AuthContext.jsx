import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mangohrms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mangohrms_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mangohrms_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loginAs = (role, email, name) => {
    let userObj = {};
    if (role === 'hr') {
      userObj = {
        role: 'hr',
        name: name || 'Pooja Deshmukh (HR Operations Director)',
        email: email || 'pooja.deshmukh@mangohrms.com',
        avatar: 'P',
        badge: 'HR Administrator'
      };
    } else {
      userObj = {
        role: 'candidate',
        name: name || 'Sneha Rao',
        email: email || 'sneha.rao@mangohrms.com',
        avatar: 'S',
        badge: 'Candidate / New Hire'
      };
    }

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
