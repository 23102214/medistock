import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Pill, AlertCircle, User, Mail, Lock, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";

// Yup registration validation schema
const schema = yup.object().shape({
  fullName: yup.string().required("Full Name is required").min(3, "Full Name must be at least 3 characters"),
  username: yup
    .string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters")
    .matches(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"),
  email: yup.string().email("Invalid email format").required("Email address is required"),
  password: yup.string().min(5, "Password must be at least 5 characters").required("Password is required"),
  role: yup.string().oneOf(["STAFF", "PHARMACIST", "ADMIN"], "Invalid role selected").required("Role is required"),
});

export const Register = () => {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      role: "STAFF",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMessage("");
    const result = await registerUser(data.username, data.email, data.fullName, data.password, data.role);
    if (result.success) {
      toast.success("Account registered successfully in directory!");
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } else {
      setErrorMessage(result.error);
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Decorative Clinical Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2f4f6_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 z-0" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
        {/* Medical Cross Icon */}
        <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20 mb-4 animate-pulse">
          <Pill className="w-8 h-8 transform rotate-45" />
        </div>
        
        <h2 className="text-2xl font-extrabold font-display text-center text-slate-800 tracking-tight">
          Create Clinical Account
        </h2>
        <p className="mt-1 text-center text-xs font-semibold text-slate-400">
          Register with the MediStock Healthcare Directory
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-slate-100">
          
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Registration Complete</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Your medical node profile has been compiled successfully. Redirecting you to the secure login hub...
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-4 bg-red-50 border border-red-150 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold">Registration Failed</p>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="mt-1 relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Dr. John Doe"
                      {...register("fullName")}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                        errors.fullName ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                      }`}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-xs text-red-500 font-semibold">{errors.fullName.message}</p>
                    )}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Username
                  </label>
                  <div className="mt-1 relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="johndoe"
                      {...register("username")}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                        errors.username ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                      }`}
                    />
                    {errors.username && (
                      <p className="mt-1 text-xs text-red-500 font-semibold">{errors.username.message}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Work Email
                  </label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="johndoe@medistock.com"
                      {...register("email")}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                        errors.email ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500 font-semibold">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      {...register("password")}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                        errors.password ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                      }`}
                    />
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500 font-semibold">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Access Role
                  </label>
                  <div className="mt-1 relative">
                    <Shield className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <select
                      id="role"
                      name="role"
                      {...register("role")}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white transition-all appearance-none cursor-pointer ${
                        errors.role ? "border-red-400" : "border-slate-200 focus:border-brand"
                      }`}
                    >
                      <option value="STAFF">Staff (Inventory & Basic Operations)</option>
                      <option value="PHARMACIST">Pharmacist (Clinical Approval & Batches)</option>
                      <option value="ADMIN">Admin (Full System Permissions)</option>
                    </select>
                  </div>
                  {errors.role && (
                    <p className="mt-1 text-xs text-red-500 font-semibold">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 mt-2 border border-transparent rounded-2xl text-sm font-extrabold text-white bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-55 cursor-pointer transition-all"
                  >
                    {loading ? "Registering profile..." : "Create Account"}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Already registered?{" "}
              <Link to="/login" className="font-bold text-brand hover:text-brand-hover">
                Sign In
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
