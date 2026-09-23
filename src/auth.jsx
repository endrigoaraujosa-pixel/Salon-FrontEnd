import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./api";
import { startVisiblePolling } from './lib/visiblePolling';

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    return startVisiblePolling(signal => api.post('/auth/presence', {}, { signal, timeout: 10000 }));
  }, [user?.id]);

  useEffect(() => {
    const token = localStorage.getItem("salon_token");
    if (!token) {
      setLoading(false);
      return;
    }
    
    api.get("/auth/me")
      .then((response) => {
        setUser(response.data);
      })
      .catch(() => {
        localStorage.removeItem("salon_token");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { 
        email: email, 
        password: password 
      });
      
      const { token, user } = response.data;
      localStorage.setItem("salon_token", token);
      setUser(user);
      return user;
    } catch (error) {
      console.error("Erro no login:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Erro no logout:", error);
    }
    localStorage.removeItem("salon_token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
