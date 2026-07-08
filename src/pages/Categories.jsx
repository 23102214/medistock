import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getData, postData, putData, deleteData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Edit2, Trash2, FolderPlus, Info, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Schema for categories
const schema = yup.object().shape({
  name: yup.string().required("Category name is required").min(3, "Too short"),
  description: yup.string().required("Description is required").min(10, "Description must be at least 10 characters"),
});

export const Categories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadCategories = async () => {
    try {
      setCategories(await getData("/api/categories"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load categories");
    }
  };

  useEffect(() => {
    loadCategories();
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
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        description: editingCategory.description,
      });
    } else {
      reset({ name: "", description: "" });
    }
  }, [editingCategory, reset]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingCategory) {
        await putData(`/api/categories/${editingCategory.id}`, data);
        toast.success("Category updated successfully");
      } else {
        await postData("/api/categories", data);
        toast.success("Category created successfully");
      }
      await loadCategories();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Category action failed");
    }
  };

  const handleOpenDelete = (id) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteData(`/api/categories/${deletingId}`);
        toast.success("Category deleted");
        setDeletingId(null);
        await loadCategories();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete category");
      }
    }
  };

  // Define Table Columns
  const columns = [
    {
      key: "name",
      label: "Category Name",
      sortable: true,
      render: (row) => <span className="font-bold text-slate-800">{row.name}</span>,
    },
    {
      key: "description",
      label: "Therapeutic Scope & Description",
      sortable: false,
      render: (row) => <span className="text-xs text-slate-500 leading-tight block max-w-lg">{row.description}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">Drug Class Categories</h3>
          <p className="text-xs text-slate-400">Classify medications into unified therapeutic categories.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Main Table */}
      <CustomTable
        title="Therapeutic Drug Classes"
        columns={columns}
        data={categories}
        searchKey="name"
        searchPlaceholder="Search categories by name..."
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
        title={editingCategory ? "Edit Therapeutic Category" : "Add Therapeutic Category"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10 mb-4">
            <FolderPlus className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed font-semibold">
              Grouping medicines by therapeutic categories improves search indexing and stock replenishment workflows.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Category Name</label>
            <input
              type="text"
              placeholder="e.g. Antibiotics, Beta-blockers"
              {...register("name")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                errors.name ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 font-semibold">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Description Scope</label>
            <textarea
              rows={4}
              placeholder="Inhibit biological development or destroy pathogenic microorganisms..."
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
              {editingCategory ? "Save Category" : "Register Category"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Therapeutic Category"
        message="Are you certain you want to remove this drug category? All associated medicine SKU listings will remain, but will lose this grouping taxonomy classification."
      />
    </div>
  );
};

export default Categories;
