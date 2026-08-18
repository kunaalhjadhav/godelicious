"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, clearToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(name, email, password, phone) {
    const data = await api.register(name, email, password, phone);
    setToken(data.token);
    setUser(data.user);
  }

  async function loginWithOtp(phone, code, name) {
    const data = await api.verifyOtp(phone, code, name);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push("/");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
