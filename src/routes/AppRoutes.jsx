import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

// Layout
import DashboardLayout from "../layouts/DashboardLayout";

// Auth Pages
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";

// Standard Pages
import Dashboard from "../pages/Dashboard";
import Medicines from "../pages/Medicines";
import Batches from "../pages/Batches";
import Categories from "../pages/Categories";
import Suppliers from "../pages/Suppliers";
import PurchaseOrders from "../pages/PurchaseOrders";
import Inventory from "../pages/Inventory";
import Reports from "../pages/Reports";
import Users from "../pages/Users";
import Profile from "../pages/Profile";

// JWT Guard: Redirect unauthenticated users to Login
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen message="Loading MediStock Clinical Portal..." />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, redirect to main Dashboard with alert
    return <Navigate to="/" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Anonymous Guard: Redirect logged in users to Dashboard
const AnonymousRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen message="Loading MediStock..." />;
  }

  if (token && user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC AUTH ROUTES */}
        <Route
          path="/login"
          element={
            <AnonymousRoute>
              <Login />
            </AnonymousRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AnonymousRoute>
              <Register />
            </AnonymousRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AnonymousRoute>
              <ForgotPassword />
            </AnonymousRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AnonymousRoute>
              <ResetPassword />
            </AnonymousRoute>
          }
        />

        {/* PROTECTED USER DASHBOARD LAYOUT ROUTES */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST", "STAFF"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicines"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST", "STAFF"]}>
              <Medicines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST"]}>
              <Batches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST"]}>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST"]}>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST"]}>
              <PurchaseOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST", "STAFF"]}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "PHARMACIST", "STAFF"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK REDIRECT */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
