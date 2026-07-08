import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getData, postData, putData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import { Plus, Check, ShieldAlert, ArrowDownLeft, ArrowUpRight, Scale, Undo2 } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Schema validation for instant inventory adjustments
const schema = yup.object().shape({
  batchId: yup.string().required("Batch cargo lot selection is required"),
  type: yup.string().oneOf(["STOCK_IN", "STOCK_OUT", "RETURNED", "ADJUSTMENT"]).required("Adjustment type is required"),
  quantity: yup
    .number()
    .typeError("Qty must be an integer")
    .integer("Must be a whole number")
    .min(1, "Qty must be at least 1 unit")
    .required("Quantity is required"),
  remarks: yup.string().required("Reason for adjustment is required").min(8, "Please enter a descriptive reason"),
});

export const Inventory = () => {
  const { user } = useAuth();
  
  // Lists
  const [transactions, setTransactions] = useState([]);
  const [batches, setBatches] = useState([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAllData = async () => {
    try {
      const [transactionRows, batchRows] = await Promise.all([
        getData("/api/transactions"),
        getData("/api/batches"),
      ]);
      setTransactions(transactionRows);
      setBatches(batchRows);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load inventory data");
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      batchId: "",
      type: "ADJUSTMENT",
      quantity: "",
      remarks: "",
    },
  });

  const onSubmit = async (data) => {
    const batch = batches.find((b) => b.id === data.batchId);

    if (!batch) {
      toast.error("Selected Batch Lot not found.");
      return;
    }

    const qtyVal = Number(data.quantity);

    // If STOCK_OUT, EXPIRED or negative ADJUSTMENT, verify we have enough stock!
    if (data.type === "STOCK_OUT" || data.type === "ADJUSTMENT") {
      // For ADJUSTMENT, let's treat it as stock-out/subtraction in this quick terminal form
      if (batch.quantity < qtyVal) {
        toast.error(`Insufficient cargo volume inside Lot ${batch.batchNumber}. Available: ${batch.quantity}`);
        return;
      }
    }

    // Apply adjustment changes to batch
    const originalQty = batch.quantity;
    let newQty = originalQty;

    if (data.type === "STOCK_IN" || data.type === "RETURNED") {
      newQty += qtyVal;
    } else {
      newQty -= qtyVal;
    }

    try {
      await putData(`/api/batches/${batch.id}`, { ...batch, quantity: newQty });
      await postData("/api/transactions", {
        date: new Date().toISOString().split("T")[0],
        type: data.type,
        medicineId: batch.medicineId,
        quantity: qtyVal,
        batchNumber: batch.batchNumber,
        remarks: `${data.remarks} (Manually modified by terminal operator)`,
      });

      toast.success("Physical adjustment logged. Stock counts updated.");
      await loadAllData();
      setIsModalOpen(false);
      reset({
        batchId: "",
        type: "ADJUSTMENT",
        quantity: "",
        remarks: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to log inventory adjustment");
    }
  };

  // Define Columns
  const columns = [
    {
      key: "date",
      label: "Timestamp",
      sortable: true,
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row) => {
        let style = "bg-slate-50 text-slate-500 border border-slate-100";
        let icon = null;

        if (row.type === "STOCK_IN") {
          style = "bg-emerald-50 text-emerald-600 border border-emerald-100";
          icon = <ArrowDownLeft className="w-3.5 h-3.5 inline mr-1" />;
        } else if (row.type === "STOCK_OUT") {
          style = "bg-sky-50 text-sky-600 border border-sky-100";
          icon = <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" />;
        } else if (row.type === "EXPIRED" || row.type === "QUARANTINE") {
          style = "bg-red-50 text-red-600 border border-red-100";
          icon = <ShieldAlert className="w-3.5 h-3.5 inline mr-1 animate-pulse" />;
        } else if (row.type === "RETURNED") {
          style = "bg-purple-50 text-purple-600 border border-purple-100";
          icon = <Undo2 className="w-3.5 h-3.5 inline mr-1" />;
        } else if (row.type === "ADJUSTMENT") {
          style = "bg-amber-50 text-amber-600 border border-amber-100";
          icon = <Scale className="w-3.5 h-3.5 inline mr-1" />;
        }

        return (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${style}`}>
            {icon}
            {row.type}
          </span>
        );
      },
    },
    {
      key: "medicineName",
      label: "Medication SKU",
      sortable: true,
      render: (row) => <span className="font-bold text-slate-800 block">{row.medicineName}</span>,
    },
    {
      key: "batchNumber",
      label: "Batch Lot",
      render: (row) => <span className="font-mono bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-500 font-bold text-[10px]">{row.batchNumber}</span>,
    },
    {
      key: "quantity",
      label: "Quantity",
      sortable: true,
      render: (row) => (
        <span
          className={`font-bold ${
            row.type === "STOCK_IN" || row.type === "RETURNED" ? "text-emerald-500" : "text-slate-700"
          }`}
        >
          {row.type === "STOCK_IN" || row.type === "RETURNED" ? "+" : "-"}
          {row.quantity} units
        </span>
      ),
    },
    {
      key: "remarks",
      label: "Audit Remarks / Reason",
      render: (row) => <span className="text-slate-500 text-xs italic block max-w-sm truncate">{row.remarks}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">Inventory Transaction Audits</h3>
          <p className="text-xs text-slate-400">View real-time stock-in/stock-out logs and perform physical corrections.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Log Manual Correction
        </button>
      </div>

      <CustomTable
        title="Physical Inventory Ledger"
        columns={columns}
        data={transactions}
        searchKey="medicineName"
        searchPlaceholder="Search logs by drug name..."
        filterOptions={[{ key: "type", label: "Transaction Type", options: ["STOCK_IN", "STOCK_OUT", "EXPIRED", "RETURNED", "ADJUSTMENT"] }]}
        initialRowsPerPage={10}
      />

      {/* Adjustments Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Physical Stock Correction" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10">
            <Scale className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed font-semibold">
              Manual correction bypasses purchase orders and represents physical write-offs, returned inventory, or clinical stock audit adjustments.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Batch Lot</label>
            <select
              {...register("batchId")}
              className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            >
              <option value="">Choose Batch Lot...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.medicineName} ({b.batchNumber}) | Active Stock: {b.quantity}
                </option>
              ))}
            </select>
            {errors.batchId && <p className="text-xs text-red-500 font-semibold">{errors.batchId.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adjustment Type</label>
              <select
                {...register("type")}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="ADJUSTMENT">STOCK ADJUSTMENT (Subtract Quantity)</option>
                <option value="STOCK_OUT">STOCK WRITE-OFF (Subtract Quantity)</option>
                <option value="STOCK_IN">MANUAL ADD (Add Quantity)</option>
                <option value="RETURNED">RETURNED GOODS (Add Quantity)</option>
              </select>
              {errors.type && <p className="text-xs text-red-500 font-semibold">{errors.type.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adjustment Quantity</label>
              <input
                type="number"
                placeholder="e.g. 50"
                {...register("quantity")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.quantity ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.quantity && <p className="text-xs text-red-500 font-semibold">{errors.quantity.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason & Audit Remarks</label>
            <textarea
              rows={3}
              placeholder="e.g. Broken vials, damage during manual count reconciliation, clinical return..."
              {...register("remarks")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                errors.remarks ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
              }`}
            />
            {errors.remarks && <p className="text-xs text-red-500 font-semibold">{errors.remarks.message}</p>}
          </div>

          <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Apply Correction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
