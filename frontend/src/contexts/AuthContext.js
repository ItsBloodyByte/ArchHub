import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('archhub_token'));
  const [loading, setLoading] = useState(true);

  const setAuth = useCallback((tokenVal, userData) => {
    if (tokenVal) {
      localStorage.setItem('archhub_token', tokenVal);
      setToken(tokenVal);
      setUser(userData);
    } else {
      localStorage.removeItem('archhub_token');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch {
        setAuth(null, null);
      }
      setLoading(false);
    };
    loadUser();
  }, [token, setAuth]);

  const login = async (username, password, totpCode) => {
    const res = await axios.post(`${API}/auth/login`, { username, password, totp_code: totpCode || null });
    if (res.data.requires_2fa) {
      return { requires_2fa: true };
    }
    setAuth(res.data.token, res.data.user);
    return res.data;
  };

  const register = async (username, password, email, honeypot, formLoadedAt) => {
    const res = await axios.post(`${API}/auth/register`, {
      username, password, email: email || null,
      honeypot: honeypot || null,
      form_loaded_at: formLoadedAt || null
    });
    setAuth(res.data.token, res.data.user);
    return res.data;
  };

  const logout = () => setAuth(null, null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
