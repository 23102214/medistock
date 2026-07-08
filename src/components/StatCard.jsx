import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export const StatCard = ({ title, value, icon: Icon, change, changeType, onClick, color = "brand", subtitle }) => {
  const colorMap = {
    brand: "border-brand text-brand bg-brand-light",
    red: "border-red-500 text-red-500 bg-red-50",
    yellow: "border-amber-500 text-amber-500 bg-amber-50",
    green: "border-emerald-500 text-emerald-500 bg-emerald-50",
    blue: "border-sky-500 text-sky-500 bg-sky-50",
    purple: "border-violet-500 text-violet-500 bg-violet-50",
  };

  const borderClass = colorMap[color] || colorMap.brand;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-l-4 p-5 shadow-sm border-y border-r border-slate-100 hover:shadow-md transition-all duration-200 ${
        onClick ? "cursor-pointer transform hover:-translate-y-1" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold font-display mt-2 text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${borderClass.split(" ")[2]} ${borderClass.split(" ")[1]}`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>

      <div className="flex items-center mt-4 text-xs font-medium">
        {change && (
          <span
            className={`flex items-center mr-2 px-1.5 py-0.5 rounded ${
              changeType === "up" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
            }`}
          >
            {changeType === "up" ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            {change}
          </span>
        )}
        <span className="text-slate-400">{subtitle || "Vs previous month"}</span>
      </div>
    </div>
  );
};

export default StatCard;
