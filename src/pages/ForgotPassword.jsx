import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Pill, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";

const schema = yup.object().shape({
  email: yup.string().email("Invalid email format").required("Email address is required"),
});

export const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await forgotPassword(data.email);
    if (res.success) {
      setSuccessMsg(res.message);
      toast.success("Instructions sent successfully!");
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
          Forgot Password
        </h2>
        <p className="mt-1 text-center text-xs font-semibold text-slate-400">
          MediStock Healthcare Core Network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-slate-100">
          {successMsg ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Check Your Inbox</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                We've dispatched password recovery parameters and instructions to your registered healthcare email node.
              </p>
              <div className="pt-4">
                <Link
                  to="/reset-password"
                  className="inline-flex w-full justify-center items-center py-3 px-4 border border-transparent rounded-2xl text-xs font-extrabold text-white bg-brand hover:bg-brand-hover shadow-sm"
                >
                  Enter Recovery Code
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide your registered email address below, and we will dispatch a secure 6-digit credential reset code to your terminal.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Account Email Address
                </label>
                <div className="mt-1.5 relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="doctor@medistock.com"
                    {...register("email")}
                    className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                      errors.email ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 border border-transparent rounded-2xl text-sm font-extrabold text-white bg-brand hover:bg-brand-hover shadow-md focus:outline-none disabled:opacity-55 cursor-pointer transition-all"
                >
                  {loading ? "Verifying email address..." : "Request Reset Code"}
                </button>
              </div>
            </form>
          )}

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

export default ForgotPassword;
