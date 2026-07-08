import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { mockDb } from "../utils/mockDb";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("medistock_token") || null);
  const [loading, setLoading] = useState(true);

  // Initialize and check JWT on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("medistock_token");
      if (storedToken) {
        try {
          // Set temporary token to let interceptor attach it
          setToken(storedToken);
          const response = await api.get("/api/auth/me");
          setUser(response.data?.data || response.data);
        } catch (error) {
          console.error("Failed to restore session:", error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", { username, password });
      const authData = response.data?.data || response.data;
      const jwtToken = authData.token;
      const loggedUser = {
        username: authData.username,
        fullName: authData.fullName,
        role: authData.role,
      };
      
      localStorage.setItem("medistock_token", jwtToken);
      setToken(jwtToken);
      setUser(loggedUser);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed. Please check your credentials.";
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("medistock_token");
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const forgotPassword = async (email) => {
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      return { success: true, message: res.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || "Failed to process request." };
    }
  };

  const registerUser = async (username, email, fullName, password, role) => {
    try {
      const res = await api.post("/api/auth/register", { username, email, fullName, password, role });
      return { success: true, message: res.data?.message || "Registration successful." };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || "Registration failed." };
    }
  };

  const resetPassword = async (resetToken, newPassword) => {
    try {
      const res = await api.post("/api/auth/reset-password", { token: resetToken, newPassword });
      return { success: true, message: res.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || "Failed to reset password." };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // In mock, admin can update their profile or user profile
      const users = mockDb.getUsers();
      const updatedUsers = users.map((u) => {
        if (u.id === user.id) {
          return { ...u, ...profileData };
        }
        return u;
      });
      mockDb.saveUsers(updatedUsers);
      setUser({ ...user, ...profileData });
      mockDb.addSystemLog(user.username, "PROFILE_UPDATE", "Updated own user profile information");
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update profile details" };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    registerUser,
    forgotPassword,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
