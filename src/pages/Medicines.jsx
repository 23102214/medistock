import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getData, postData, putData, deleteData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Edit2, Trash2, ShieldAlert, BadgeDollarSign, HeartPulse, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Schema validation
const schema = yup.object().shape({
  name: yup.string().required("Medicine name is required").min(3, "Too short"),
  categoryId: yup.string().required("Category is required"),
  supplierId: yup.string().required("Supplier is required"),
  price: yup.number().typeError("Price must be a number").positive("Must be a positive amount").required("Price is required"),
  minStock: yup.number().typeError("Min stock must be an integer").integer("Must be a whole number").min(1, "Minimum safety stock is 1").required("Safety stock is required"),
  description: yup.string().required("Description is required").min(10, "Description must be descriptive"),
});

export const Medicines = () => {
  const { user } = useAuth();
  
  // Lists
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadAllData = async () => {
    try {
      const [medicineRows, categoryRows, supplierRows] = await Promise.all([
        getData("/api/medicines"),
        getData("/api/categories"),
        getData("/api/suppliers"),
      ]);
      setCategories(categoryRows);
      setSuppliers(supplierRows);
      setMedicines(medicineRows.map((medicine) => {
        const catName = categoryRows.find(c => c.id === medicine.categoryId)?.name || medicine.categoryName || medicine.category || "";
        const supName = supplierRows.find(s => s.id === medicine.supplierId)?.name || medicine.supplierName || "";
        return {
          ...medicine,
          minStock: medicine.minStock ?? medicine.minStockThreshold ?? 0,
          currentStock: medicine.currentStock ?? 0,
          categoryName: catName,
          supplierName: supName,
        };
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load medicines");
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
    if (editingMedicine) {
      reset({
        name: editingMedicine.name,
        categoryId: editingMedicine.categoryId,
        supplierId: editingMedicine.supplierId,
        price: editingMedicine.price,
        minStock: editingMedicine.minStock,
        description: editingMedicine.description,
      });
    } else {
      reset({
        name: "",
        categoryId: "",
        supplierId: "",
        price: "",
        minStock: "",
        description: "",
      });
    }
  }, [editingMedicine, reset]);

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med) => {
    setEditingMedicine(med);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    const cat = categories.find((c) => c.id === data.categoryId);
    const sup = suppliers.find((s) => s.id === data.supplierId);
    if (!cat || !sup) {
      toast.error("Select a category and supplier from backend records before saving a medicine.");
      return;
    }

    const payload = {
      name: data.name,
      genericName: data.name,
      category: cat.name,
      categoryId: cat.id,
      supplierName: sup.name,
      supplierId: sup.id,
      price: Number(data.price),
      minStockThreshold: Number(data.minStock),
      description: data.description,
    };

    try {
      if (editingMedicine) {
        await putData(`/api/medicines/${editingMedicine.id}`, payload);
        toast.success("Medicine specifications updated");
      } else {
        await postData("/api/medicines", payload);
        toast.success("Medicine SKU registered");
      }
      await loadAllData();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Medicine action failed");
    }
  };

  const handleOpenDelete = (id) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteData(`/api/medicines/${deletingId}`);
        toast.success("Medicine removed");
        setDeletingId(null);
        await loadAllData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete medicine");
      }
    }
  };

  // Define Columns
  const columns = [
    {
      key: "name",
      label: "Medicine Name",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 block">{row.name}</span>
          <span className="text-[10px] text-slate-400 block max-w-xs truncate">{row.description}</span>
        </div>
      ),
    },
    {
      key: "categoryName",
      label: "Drug Class",
      sortable: true,
      render: (row) => (
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">
          {row.categoryName}
        </span>
      ),
    },
    {
      key: "price",
      label: "Dispensing Price",
      sortable: true,
      render: (row) => <span className="font-bold text-brand">${Number(row.price).toFixed(2)}</span>,
    },
    {
      key: "currentStock",
      label: "Current Stock",
      sortable: true,
      render: (row) => {
        const isLow = row.currentStock <= row.minStock;
        return (
          <div>
            <span className={`font-bold text-sm ${isLow ? "text-amber-500 animate-pulse" : "text-slate-800"}`}>
              {row.currentStock} units
            </span>
            {isLow && (
              <span className="block text-[9px] font-extrabold text-amber-500 uppercase tracking-wide">
                ⚠️ Low Stock Alert
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "minStock",
      label: "Safety Limit",
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-500">{row.minStock} units</span>,
    },
    {
      key: "supplierName",
      label: "Designated Supplier",
      sortable: true,
      render: (row) => <span className="text-xs text-slate-500 block max-w-[150px] truncate">{row.supplierName}</span>,
    },
  ];

  // Dynamic filter lists for categories & suppliers
  const filterOptions = [
    {
      key: "categoryName",
      label: "Category",
      options: categories.map((c) => c.name),
    },
    {
      key: "supplierName",
      label: "Supplier",
      options: suppliers.map((s) => s.name),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">Clinical Drug Catalogue</h3>
          <p className="text-xs text-slate-400">View and manage drug specifications and active catalogue listings.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Medicine SKU
        </button>
      </div>

      <CustomTable
        title="Drug Catalogue Items"
        columns={columns}
        data={medicines}
        searchKey="name"
        searchPlaceholder="Search medications..."
        filterOptions={filterOptions}
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
        title={editingMedicine ? "Edit Medicine SKU Specifications" : "Register Drug SKU Item"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10">
            <HeartPulse className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed font-semibold">
              SKUs defined here set the safety boundaries and pricing models. Physical inventory stock is entered by adding corresponding Batches to this SKU.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Medicine Name</label>
            <input
              type="text"
              placeholder="e.g. Paracetamol 650mg, Amoxicillin 500mg"
              {...register("name")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                errors.name ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 font-semibold">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Drug Class Category</label>
              <select
                {...register("categoryId")}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="">Choose Class...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-500 font-semibold">{errors.categoryId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Primary Supplier</label>
              <select
                {...register("supplierId")}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.filter(s => s.status === "ACTIVE").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.supplierId && <p className="text-xs text-red-500 font-semibold">{errors.supplierId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <BadgeDollarSign className="w-3.5 h-3.5 text-slate-400" />
                Selling Price ($)
              </label>
              <input
                type="text"
                placeholder="0.00"
                {...register("price")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.price ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.price && <p className="text-xs text-red-500 font-semibold">{errors.price.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                Safety Stock Limit (Reorder trigger)
              </label>
              <input
                type="number"
                placeholder="e.g. 100"
                {...register("minStock")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.minStock ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.minStock && <p className="text-xs text-red-500 font-semibold">{errors.minStock.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Usage Details & Description</label>
            <textarea
              rows={3}
              placeholder="Dosage form, packaging, and specific clinical remarks..."
              {...register("description")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                errors.description ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
              }`}
            />
            {errors.description && <p className="text-xs text-red-500 font-semibold">{errors.description.message}</p>}
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
              {editingMedicine ? "Save Specifications" : "Register Drug SKU"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Medicine SKU"
        message="Are you certain you want to delete this medication SKU catalogue entry? ALL physical batches currently logged in the warehouse for this medication will be automatically purged and stocked out permanently."
      />
    </div>
  );
};

export default Medicines;
