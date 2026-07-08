import React from "react";

export const Loader = ({ fullScreen = false, size = "md", message = "Loading..." }) => {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-10 h-10 border-4",
    lg: "w-16 h-16 border-4"
  };

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className={`${sizeClasses[size]} border-brand border-t-transparent rounded-full animate-spin`} />
      {message && <p className="mt-3 text-sm font-medium text-slate-500 animate-pulse">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xs w-full flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default Loader;
