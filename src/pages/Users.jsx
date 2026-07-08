import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getData, postData, putData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Edit2, KeyRound, Check, ShieldAlert, UserCheck, UserX, UserPlus, Shield } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Schema for adding users
const userSchema = yup.object().shape({
  username: yup
    .string()
    .required("Username is required")
    .matches(/^[a-zA-Z0-9_]{3,15}$/, "3-15 alphanumeric characters or underscore"),
  fullName: yup.string().required("Full name is required").min(3, "Too short"),
  email: yup.string().email("Invalid email").required("Email is required"),
  role: yup.string().oneOf(["ADMIN", "PHARMACIST", "STAFF"]).required("Role selection is required"),
  status: yup.string().oneOf(["ACTIVE", "INACTIVE"]).required("Status is required"),
  password: yup.string().required("Password is required").min(5, "Password must be at least 5 characters"),
});

// Schema for editing users (password is optional)
const editUserSchema = yup.object().shape({
  fullName: yup.string().required("Full name is required").min(3, "Too short"),
  email: yup.string().email("Invalid email").required("Email is required"),
  role: yup.string().oneOf(["ADMIN", "PHARMACIST", "STAFF"]).required("Role is required"),
  status: yup.string().oneOf(["ACTIVE", "INACTIVE"]).required("Status is required"),
});

// Schema for password overrides
const resetPasswordSchema = yup.object().shape({
  newPassword: yup.string().required("New password is required").min(5, "Password must be at least 5 characters"),
});

export const Users = () => {
  const { user: currentUser } = useAuth();

  // Lists
  const [users, setUsers] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordResetUser, setPasswordResetUser] = useState(null); // holds user for password override
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [togglingUser, setTogglingUser] = useState(null);

  const loadUsers = async () => {
    try {
      setUsers(await getData("/api/users"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Creation Hook
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    resolver: yupResolver(userSchema),
  });

  // Edit Hook
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm({
    resolver: yupResolver(editUserSchema),
  });

  // Password Override Hook
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    reset: resetReset,
    setValue: setResetValue,
    formState: { errors: resetErrors },
  } = useForm({
    resolver: yupResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (editingUser) {
      resetEdit({
        fullName: editingUser.fullName,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status,
      });
    }
  }, [editingUser, resetEdit]);

  // Actions
  const onCreateSubmit = async (data) => {
    try {
      await postData("/api/auth/register", data);
      toast.success(`Account registered successfully: ${data.username}`);
      await loadUsers();
      setIsCreateOpen(false);
      resetCreate();
    } catch (error) {
      toast.error(error.response?.data?.message || "User registration failed");
    }
  };

  const onEditSubmit = async (data) => {
    if (editingUser) {
      // Guard: Cannot disable yourself!
      if (editingUser.username === currentUser.username && data.status === "INACTIVE") {
        toast.error("Security Guard: You are forbidden from disabling your active session account!");
        return;
      }

      try {
        await putData(`/api/users/${editingUser.id}`, data);
        toast.success("Account parameters updated");
        await loadUsers();
        setEditingUser(null);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to update user");
      }
    }
  };

  const onResetSubmit = (data) => {
    if (passwordResetUser) {
      toast.error("Password override is not connected to the backend yet.");
      setPasswordResetUser(null);
      resetReset();
    }
  };

  const handleOpenToggleStatus = (userNode) => {
    if (userNode.username === currentUser.username) {
      toast.error("Security Guard: You cannot toggle your own active session status.");
      return;
    }
    setTogglingUser(userNode);
    setIsConfirmToggleOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (togglingUser) {
      const nextStatus = togglingUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      try {
        await putData(`/api/users/${togglingUser.id}`, { ...togglingUser, status: nextStatus });
        toast.success(`Account status updated to ${nextStatus}`);
        await loadUsers();
        setIsConfirmToggleOpen(false);
        setTogglingUser(null);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to update account status");
      }
    }
  };

  // Pre-fill a secure random string for administrative password reset
  const generateRandomPassword = () => {
    const code = `MST-${Math.floor(100000 + Math.random() * 900000)}`;
    setResetValue("newPassword", code);
    toast.info(`Pre-filled administrative passkey: ${code}`);
  };

  // Define Columns
  const columns = [
    {
      key: "fullName",
      label: "System Operator",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 block">{row.fullName}</span>
          <span className="text-[10px] text-slate-400 font-mono block">Key ID: {row.username}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email Address",
    },
    {
      key: "role",
      label: "Role Clearance",
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit uppercase ${
            row.role === "ADMIN"
              ? "bg-rose-50 text-rose-600 border border-rose-100"
              : row.role === "PHARMACIST"
              ? "bg-brand-light text-brand-dark border border-brand/10"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          <Shield className="w-3 h-3" />
          {row.role}
        </span>
      ),
    },
    {
      key: "joinedDate",
      label: "Registered Date",
      sortable: true,
    },
    {
      key: "status",
      label: "Access",
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">User Access Directory</h3>
          <p className="text-xs text-slate-400">Manage clinical database operators, authorization privileges, and logs.</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register Operator
        </button>
      </div>

      <CustomTable
        title="Database Operator Clearance"
        columns={columns}
        data={users}
        searchKey="fullName"
        searchPlaceholder="Search active profiles..."
        filterOptions={[{ key: "role", label: "Role", options: ["ADMIN", "PHARMACIST", "STAFF"] }]}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleOpenToggleStatus(row)}
              className={`p-1.5 rounded-lg border border-slate-100 bg-slate-50 transition-all cursor-pointer ${
                row.status === "ACTIVE" ? "text-slate-500 hover:text-red-500 hover:bg-red-50" : "text-slate-500 hover:text-emerald-500 hover:bg-emerald-50"
              }`}
              title={row.status === "ACTIVE" ? "Revoke account access" : "Grant account access"}
            >
              {row.status === "ACTIVE" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setEditingUser(row)}
              className="p-1.5 text-slate-500 hover:text-brand bg-slate-50 hover:bg-brand/10 border border-slate-100 rounded-lg transition-all cursor-pointer"
              title="Edit Profile specifications"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                resetReset();
                setPasswordResetUser(row);
              }}
              className="p-1.5 text-slate-500 hover:text-brand bg-slate-50 hover:bg-brand/10 border border-slate-100 rounded-lg transition-all cursor-pointer"
              title="Override password credentials"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      />

      {/* CREATE OPERATOR MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register System Operator" size="md">
        <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10">
            <UserPlus className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed font-semibold">
              Fill out the operator profile. Registering user ids must be completely unique. Passkeys can be modified at any time by supervisors.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unique Login ID / Username</label>
            <input
              type="text"
              placeholder="e.g. dr_smith"
              {...registerCreate("username")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                createErrors.username ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
              }`}
            />
            {createErrors.username && <p className="text-xs text-red-500 font-semibold">{createErrors.username.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. John Smith"
                {...registerCreate("fullName")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  createErrors.fullName ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {createErrors.fullName && <p className="text-xs text-red-500 font-semibold">{createErrors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                placeholder="smith@medistock.com"
                {...registerCreate("email")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  createErrors.email ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {createErrors.email && <p className="text-xs text-red-500 font-semibold">{createErrors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Clearance Role</label>
              <select
                {...registerCreate("role")}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="STAFF">STAFF (Inventory Read Only)</option>
                <option value="PHARMACIST">PHARMACIST (Inventory CRUD, PO Actions)</option>
                <option value="ADMIN">ADMIN (Full clearance, Audit Access)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Initial Login Passkey</label>
              <input
                type="text"
                placeholder="Minimum 5 characters"
                {...registerCreate("password")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-mono ${
                  createErrors.password ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {createErrors.password && <p className="text-xs text-red-500 font-semibold">{createErrors.password.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Login Clearance Status</label>
            <select
              {...registerCreate("status")}
              className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            >
              <option value="ACTIVE">ACTIVE (Granted Database terminal clearance)</option>
              <option value="INACTIVE">INACTIVE (Frozen / De-authorized account)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Register Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT OPERATOR DETAILS MODAL */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Modify Clearance Profile" size="md">
        {editingUser && (
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Login ID / Username (Read Only)</label>
              <input
                type="text"
                disabled
                value={editingUser.username}
                className="w-full px-4 py-2.5 border border-slate-100 bg-slate-50 rounded-xl text-sm text-slate-400 font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                placeholder="Dr. John Doe"
                {...registerEdit("fullName")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  editErrors.fullName ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {editErrors.fullName && <p className="text-xs text-red-500 font-semibold">{editErrors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                placeholder="john@medistock.com"
                {...registerEdit("email")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  editErrors.email ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {editErrors.email && <p className="text-xs text-red-500 font-semibold">{editErrors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Privilege Role</label>
                <select
                  {...registerEdit("role")}
                  className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="PHARMACIST">PHARMACIST</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                <select
                  {...registerEdit("status")}
                  className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Save specifications
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* OVERRIDE PASSKEY MODAL */}
      <Modal isOpen={!!passwordResetUser} onClose={() => setPasswordResetUser(null)} title="Override Operator Passkey" size="md">
        {passwordResetUser && (
          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
            <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl flex gap-2.5 text-xs border border-red-200">
              <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse text-red-500" />
              <p className="leading-relaxed font-semibold">
                Critical override: You are changing login credentials for terminal operator <strong>{passwordResetUser.username}</strong> directly.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Override Passkey</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Minimum 5 characters"
                  {...registerReset("newPassword")}
                  className={`flex-1 px-4 py-2.5 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                    resetErrors.newPassword ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                  }`}
                />
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-extrabold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Auto-Gen
                </button>
              </div>
              {resetErrors.newPassword && (
                <p className="text-xs text-red-500 font-semibold">{resetErrors.newPassword.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Change Passkey
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRM INACTIVE TOGGLE */}
      <ConfirmDialog
        isOpen={isConfirmToggleOpen}
        onClose={() => setIsConfirmToggleOpen(false)}
        onConfirm={handleConfirmToggle}
        title="Override Operator Session Status"
        message={`Are you certain you want to toggle database session clearance for operator "${togglingUser?.username}"? If disabled, they will be instantly logged out and locked out of database terminal services.`}
      />
    </div>
  );
};

export default Users;
