import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Pill, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";

const schema = yup.object().shape({
  token: yup.string().length(6, "Code must be exactly 6 characters").required("Verification code is required"),
  password: yup.string().min(5, "Password must be at least 5 characters").required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
});

export const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await resetPassword(data.token, data.password);
    if (res.success) {
      toast.success(res.message);
      navigate("/login");
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#e2f4f6_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 z-0" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/10 mb-4">
          <Pill className="w-8 h-8 transform rotate-45" />
        </div>
        <h2 className="text-2xl font-extrabold font-display text-center text-slate-800 tracking-tight">
          Set New Password
        </h2>
        <p className="mt-1 text-center text-xs font-semibold text-slate-400">
          MediStock Healthcare Core Network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                6-Digit Recovery Code
              </label>
              <div className="mt-1.5 relative">
                <ShieldCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  id="token"
                  name="token"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  {...register("token")}
                  className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all uppercase tracking-widest text-center font-bold ${
                    errors.token ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                  }`}
                />
                {errors.token && (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">{errors.token.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                New Secure Password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                    errors.password ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                  }`}
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Confirm New Password
              </label>
              <div className="mt-1.5">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                    errors.confirmPassword ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500 font-semibold">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 border border-transparent rounded-2xl text-sm font-extrabold text-white bg-brand hover:bg-brand-hover shadow-md focus:outline-none disabled:opacity-55 cursor-pointer transition-all"
              >
                {loading ? "Updating credentials..." : "Reset Password"}
              </button>
            </div>
          </form>

          <div className="mt-6 flex justify-center">
            <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-brand flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
