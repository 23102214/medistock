import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getData, postData, putData, deleteData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Edit2, Trash2, CalendarDays, FlaskConical, CircleAlert, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Schema validation
const schema = yup.object().shape({
  medicineId: yup.string().required("Medicine SKU selection is required"),
  batchNumber: yup
    .string()
    .required("Batch number is required")
    .matches(/^[A-Z0-9-]{4,15}$/, "Batch number must be alphanumeric (4-15 characters) and contain uppercase letters, numbers, or dashes"),
  manufacturingDate: yup.string().required("Manufacturing date is required"),
  expiryDate: yup
    .string()
    .required("Expiry date is required")
    .test("is-after-mfg", "Expiry date must be after manufacturing date", function (val) {
      const { manufacturingDate } = this.parent;
      if (!val || !manufacturingDate) return true;
      return new Date(val) > new Date(manufacturingDate);
    }),
  quantity: yup
    .number()
    .typeError("Quantity must be an integer")
    .integer("Must be a whole number")
    .min(1, "Batch quantity must be at least 1 unit")
    .required("Quantity is required"),
  purchasePrice: yup
    .number()
    .typeError("Purchase cost must be a decimal")
    .positive("Must be a positive amount")
    .required("Purchase cost is required"),
  sellingPrice: yup
    .number()
    .typeError("Selling price must be a decimal")
    .positive("Must be a positive amount")
    .test("is-more-than-purchase", "Selling price should preferably be higher than purchase cost", function (val) {
      const { purchasePrice } = this.parent;
      if (!val || !purchasePrice) return true;
      return val >= purchasePrice;
    })
    .required("Selling price is required"),
});

export const Batches = () => {
  const { user } = useAuth();
  
  // Lists
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadAllData = async () => {
    try {
      const [batchRows, medicineRows] = await Promise.all([
        getData("/api/batches"),
        getData("/api/medicines"),
      ]);
      setBatches(batchRows);
      setMedicines(medicineRows.map((medicine) => ({
        ...medicine,
        minStock: medicine.minStock ?? medicine.minStockThreshold ?? 0,
      })));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load batches");
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (editingBatch) {
      reset({
        medicineId: editingBatch.medicineId,
        batchNumber: editingBatch.batchNumber,
        manufacturingDate: editingBatch.manufacturingDate,
        expiryDate: editingBatch.expiryDate,
        quantity: editingBatch.quantity,
        purchasePrice: editingBatch.purchasePrice,
        sellingPrice: editingBatch.sellingPrice,
      });
    } else {
      reset({
        medicineId: "",
        batchNumber: "",
        manufacturingDate: "",
        expiryDate: "",
        quantity: "",
        purchasePrice: "",
        sellingPrice: "",
      });
    }
  }, [editingBatch, reset]);

  const handleOpenAdd = () => {
    setEditingBatch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bat) => {
    setEditingBatch(bat);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    const med = medicines.find((m) => m.id === data.medicineId);
    if (!med) {
      toast.error("Select a medicine from backend records before saving a batch.");
      return;
    }

    const formattedData = {
      ...data,
      quantity: Number(data.quantity),
      purchasePrice: Number(data.purchasePrice),
      sellingPrice: Number(data.sellingPrice),
      medicineName: med.name,
    };

    try {
      if (editingBatch) {
        const difference = formattedData.quantity - editingBatch.quantity;
        await putData(`/api/batches/${editingBatch.id}`, formattedData);
        if (difference !== 0) {
          await postData("/api/transactions", {
            date: new Date().toISOString().split("T")[0],
            type: "ADJUSTMENT",
            medicineId: formattedData.medicineId,
            quantity: Math.abs(difference),
            batchNumber: formattedData.batchNumber,
            remarks: `Logged automatic stock adjustment on batch details edit (diff: ${difference})`,
          });
        }
        toast.success("Batch parameters updated");
      } else {
        await postData("/api/batches", formattedData);
        await postData("/api/transactions", {
          date: new Date().toISOString().split("T")[0],
          type: "PURCHASE",
          medicineId: formattedData.medicineId,
          quantity: formattedData.quantity,
          batchNumber: formattedData.batchNumber,
          remarks: "Logged stock-in: initial batch receipt",
        });
        toast.success("Batch cargo lot logged successfully");
      }
      await loadAllData();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Batch action failed");
    }
  };

  const handleOpenDelete = (id) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      try {
        const bat = batches.find((b) => b.id === deletingId);
        await deleteData(`/api/batches/${deletingId}`);
        if (bat) {
          await postData("/api/transactions", {
            date: new Date().toISOString().split("T")[0],
            type: "ADJUSTMENT",
            medicineId: bat.medicineId,
            quantity: bat.quantity,
            batchNumber: bat.batchNumber,
            remarks: `Purged batch ${bat.batchNumber} permanently. Entire remaining stock out.`,
          });
        }
        toast.success("Batch lot and remaining stock purged");
        setDeletingId(null);
        await loadAllData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete batch");
      }
    }
  };

  // Define Columns
  const columns = [
    {
      key: "batchNumber",
      label: "Batch Code",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200">
            {row.batchNumber}
          </span>
        </div>
      ),
    },
    {
      key: "medicineName",
      label: "Associated Medication SKU",
      sortable: true,
      render: (row) => <span className="font-bold text-slate-800 block">{row.medicineName}</span>,
    },
    {
      key: "expiryDate",
      label: "Quality Lifespan Dates",
      sortable: true,
      render: (row) => {
        const now = new Date();
        const exp = new Date(row.expiryDate);
        const diffTime = exp - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dateStyle = "text-slate-600";
        let statusTag = null;

        if (diffDays <= 0) {
          dateStyle = "text-red-500 font-bold";
          statusTag = <span className="block text-[8px] font-extrabold text-red-500 uppercase">Expired</span>;
        } else if (diffDays <= 60) {
          dateStyle = "text-amber-500 font-bold";
          statusTag = (
            <span className="block text-[8px] font-extrabold text-amber-500 uppercase">
              Expiring ({diffDays}d)
            </span>
          );
        }

        return (
          <div className="text-xs space-y-0.5">
            <p>Mfg: <span className="font-semibold text-slate-500">{row.manufacturingDate}</span></p>
            <p className={dateStyle}>Exp: <span>{row.expiryDate}</span></p>
            {statusTag}
          </div>
        );
      },
    },
    {
      key: "quantity",
      label: "Lot Volume",
      sortable: true,
      render: (row) => (
        <span className={`font-bold text-sm ${row.quantity === 0 ? "text-slate-300 line-through" : "text-slate-800"}`}>
          {row.quantity} units
        </span>
      ),
    },
    {
      key: "purchasePrice",
      label: "Pricing Structure",
      render: (row) => (
        <div className="text-xs text-slate-600 space-y-0.5">
          <p>Cost: <span className="font-bold text-slate-400">${Number(row.purchasePrice).toFixed(2)}</span></p>
          <p>Sell: <span className="font-bold text-brand">${Number(row.sellingPrice).toFixed(2)}</span></p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">Physical Cargo Batches</h3>
          <p className="text-xs text-slate-400">Track physical cargo lots, specific manufacturing details, and quality shelf-lifespan expirations.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Log Incoming Batch
        </button>
      </div>

      <CustomTable
        title="Physical Warehouse Lots"
        columns={columns}
        data={batches}
        searchKey={["batchNumber", "medicineName"]}
        searchPlaceholder="Search by batch code or medicine..."
        initialRowsPerPage={5}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 text-slate-500 hover:text-brand bg-slate-50 hover:bg-brand/10 border border-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleOpenDelete(row.id)}
              className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      />

      {/* Form Dialog Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBatch ? "Edit Cargo Lot Details" : "Log Incoming Batch Cargo"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10">
            <FlaskConical className="w-5 h-5 shrink-0 animate-pulse" />
            <p className="leading-relaxed font-semibold">
              Logistics: Register manufacturing and quality checkpoints. All entered quantities will instantly increment physical stock counts of the designated medication SKU.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Medication SKU</label>
            <select
              {...register("medicineId")}
              className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            >
              <option value="">Choose Medication...</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (Available: {m.currentStock} units)
                </option>
              ))}
            </select>
            {errors.medicineId && <p className="text-xs text-red-500 font-semibold">{errors.medicineId.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Batch Number / Code</label>
              <input
                type="text"
                placeholder="e.g. PAR-2025-01"
                {...register("batchNumber")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-mono uppercase ${
                  errors.batchNumber ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.batchNumber && <p className="text-xs text-red-500 font-semibold">{errors.batchNumber.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Batch Quantity</label>
              <input
                type="number"
                placeholder="e.g. 250"
                {...register("quantity")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.quantity ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.quantity && <p className="text-xs text-red-500 font-semibold">{errors.quantity.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Manufacturing Date</label>
              <input
                type="date"
                {...register("manufacturingDate")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.manufacturingDate ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.manufacturingDate && (
                <p className="text-xs text-red-500 font-semibold">{errors.manufacturingDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Expiry Date (Shelf Life)</label>
              <input
                type="date"
                {...register("expiryDate")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.expiryDate ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.expiryDate && <p className="text-xs text-red-500 font-semibold">{errors.expiryDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Purchase Cost ($)</label>
              <input
                type="text"
                placeholder="0.00"
                {...register("purchasePrice")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.purchasePrice ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.purchasePrice && (
                <p className="text-xs text-red-500 font-semibold">{errors.purchasePrice.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Selling Price ($)</label>
              <input
                type="text"
                placeholder="0.00"
                {...register("sellingPrice")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.sellingPrice ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.sellingPrice && <p className="text-xs text-red-500 font-semibold">{errors.sellingPrice.message}</p>}
            </div>
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
              {editingBatch ? "Save Cargo Parameters" : "Stock-In Cargo Lot"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Purge Cargo Lot"
        message="Are you certain you want to purge this physical cargo lot? ALL remaining quantities logged inside this specific batch code will be instantly Stocked Out and permanently deleted."
      />
    </div>
  );
};

export default Batches;
