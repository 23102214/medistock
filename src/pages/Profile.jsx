import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../context/AuthContext";
import { User, Shield, Mail, KeyRound, Check } from "lucide-react";
import { toast } from "react-toastify";

const schema = yup.object().shape({
  fullName: yup.string().required("Full name is required").min(3, "Too short"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().transform((curr, orig) => orig === "" ? undefined : curr).min(5, "Password must be at least 5 chars").optional(),
});

export const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      password: ""
    }
  });

  const onSubmit = async (data) => {
    setSaving(true);
    const updatePayload = {
      fullName: data.fullName,
      email: data.email,
    };
    
    // Simulating profile update via auth context
    const res = await updateProfile(updatePayload);
    if (res.success) {
      toast.success("Profile parameters updated successfully!");
      setValue("password", ""); // clear password field
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold font-display text-slate-800">User Profile Settings</h3>
        <p className="text-xs text-slate-400">View and update your active medical directory credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center text-center shadow-sm h-fit">
          <div className="w-24 h-24 rounded-full bg-brand text-white font-extrabold flex items-center justify-center border-4 border-brand-light text-3xl shadow-md uppercase">
            {user?.fullName?.substring(0, 2) || "JD"}
          </div>
          
          <h4 className="text-lg font-bold font-display mt-4 text-slate-800">{user?.fullName}</h4>
          <p className="text-xs font-semibold text-brand bg-brand-light px-3 py-1 rounded-full mt-1.5 uppercase tracking-wide">
            {user?.role} Account
          </p>
          
          <div className="w-full border-t border-slate-100 mt-6 pt-5 text-left text-xs space-y-3.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold">User Login Key:</span>
              <span className="font-mono bg-slate-50 px-2.5 py-1 border border-slate-100 rounded text-slate-700">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold">System Joined:</span>
              <span>{user?.joinedDate || "2025-01-15"}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold">System Auth:</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Active JWT
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm lg:col-span-2">
          <h5 className="text-sm font-bold font-display text-slate-700 border-b border-slate-50 pb-4 mb-6">
            Account Specifications
          </h5>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <User className="w-4 h-4 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Doe"
                  {...register("fullName")}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                    errors.fullName ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                  }`}
                />
                {errors.fullName && <p className="text-xs text-red-500 font-semibold">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="jane.doe@medistock.com"
                  {...register("email")}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                    errors.email ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                  }`}
                />
                {errors.email && <p className="text-xs text-red-500 font-semibold">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <KeyRound className="w-4 h-4 text-slate-400" />
                New Password (Leave blank to keep current)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.password ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.password && <p className="text-xs text-red-500 font-semibold">{errors.password.message}</p>}
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  "Saving updates..."
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Parameters
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
