import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = (accessToken) => {
    setToken(accessToken);
    setUser({ username: 'admin' });
    // Make token available to axios interceptor
    window.__adminToken = accessToken;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    window.__adminToken = null;
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
