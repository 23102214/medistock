import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title = "Confirm Action", message, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) => {
  const isDanger = type === "danger";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`p-3.5 rounded-full mb-4 ${isDanger ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}>
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {message || "Are you sure you want to perform this action? This operation cannot be undone."}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all focus:outline-none shadow-sm ${
              isDanger 
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/10" 
                : "bg-brand hover:bg-brand-hover shadow-brand/10"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
