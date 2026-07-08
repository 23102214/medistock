import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getData, postData, putData, deleteData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Plus, Edit2, Trash2, Eye, ArrowLeft, Mail, Phone, MapPin, ShieldAlert, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Validation schema
const schema = yup.object().shape({
  name: yup.string().required("Supplier name is required").min(3, "Too short"),
  email: yup.string().email("Invalid email format").required("Email is required"),
  phone: yup.string().required("Phone number is required"),
  address: yup.string().required("Supplier address is required").min(5, "Address must be more descriptive"),
  gstNumber: yup
    .string()
    .required("GST Number is required")
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN registration format"),
  status: yup.string().required("Status is required"),
});

export const Suppliers = () => {
  const { user } = useAuth();
  
  // States
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null); // Drill down view
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    try {
      const [supplierRows, orderRows] = await Promise.all([
        getData("/api/suppliers"),
        getData("/api/purchase-orders"),
      ]);
      setSuppliers(supplierRows);
      setPurchaseOrders(orderRows);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load suppliers");
    }
  };

  useEffect(() => {
    loadData();
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
    if (editingSupplier) {
      reset({
        name: editingSupplier.name,
        email: editingSupplier.email,
        phone: editingSupplier.phone,
        address: editingSupplier.address,
        gstNumber: editingSupplier.gstNumber,
        status: editingSupplier.status,
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        gstNumber: "",
        status: "ACTIVE",
      });
    }
  }, [editingSupplier, reset]);

  // Actions
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup, e) => {
    e.stopPropagation(); // Stop clicking table row trigger
    setEditingSupplier(sup);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingSupplier) {
        await putData(`/api/suppliers/${editingSupplier.id}`, data);
        toast.success("Supplier updated successfully");
      } else {
        await postData("/api/suppliers", data);
        toast.success("Supplier registered successfully");
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Supplier action failed");
    }
  };

  const handleOpenDelete = (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteData(`/api/suppliers/${deletingId}`);
        toast.success("Supplier profile deleted");
        setDeletingId(null);
        await loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete supplier");
      }
    }
  };

  // Extract selected supplier's profile details
  const supplierDetails = useMemo(() => {
    if (!selectedSupplierId) return null;
    return suppliers.find((s) => s.id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  // Extract selected supplier's purchase history logs
  const supplierPurchaseHistory = useMemo(() => {
    if (!selectedSupplierId) return [];
    return purchaseOrders.filter((po) => po.supplierId === selectedSupplierId);
  }, [purchaseOrders, selectedSupplierId]);

  // Standard Columns
  const columns = [
    {
      key: "name",
      label: "Supplier",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 block">{row.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">GST: {row.gstNumber}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Contact Coordinates",
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-500">
          <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-brand" /> {row.email}</p>
          <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-brand" /> {row.phone}</p>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      render: (row) => <span className="text-xs text-slate-500 block max-w-[200px] truncate">{row.address}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  // Purchase History Table Columns
  const historyColumns = [
    {
      key: "poNumber",
      label: "PO Code",
      render: (row) => <span className="font-bold text-slate-800">{row.poNumber}</span>,
    },
    {
      key: "orderDate",
      label: "Order Date",
    },
    {
      key: "totalAmount",
      label: "Total Value",
      render: (row) => <span className="font-bold text-brand">${row.totalAmount.toFixed(2)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
            row.status === "DELIVERED"
              ? "bg-emerald-50 text-emerald-600"
              : row.status === "APPROVED"
              ? "bg-sky-50 text-sky-600"
              : row.status === "CANCELLED"
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  // DRILL DOWN PROFILE VIEW
  if (supplierDetails) {
    return (
      <div className="space-y-6">
        {/* Drill Down Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSupplierId(null)}
            className="p-2 border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
          <div>
            <h3 className="text-xl font-bold font-display text-slate-800">{supplierDetails.name}</h3>
            <p className="text-xs text-slate-400">Detailed healthcare supplier profile & historical purchase audits.</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm md:col-span-1 space-y-4">
            <h4 className="text-sm font-bold font-display text-slate-700 border-b border-slate-50 pb-2 mb-3">
              Supplier Metrics
            </h4>
            <div className="space-y-4 text-xs text-slate-600">
              <div className="space-y-1">
                <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wide">GST Identification</span>
                <span className="font-mono bg-slate-50 px-2 py-1 rounded text-slate-700 font-semibold border border-slate-100 block w-fit">
                  {supplierDetails.gstNumber}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wide">Email Coordinates</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-brand" />
                  {supplierDetails.email}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wide">Phone Coordinates</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-brand" />
                  {supplierDetails.phone}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wide">Warehouse Address</span>
                <span className="flex items-start gap-1 font-semibold text-slate-700 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                  {supplierDetails.address}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wide">Account Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                    supplierDetails.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {supplierDetails.status}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase History list */}
          <div className="md:col-span-2 space-y-4">
            <CustomTable
              title="Procurement Purchase History"
              columns={historyColumns}
              data={supplierPurchaseHistory}
              searchPlaceholder="Search historical logs..."
              searchKey="poNumber"
              initialRowsPerPage={5}
            />
          </div>
        </div>
      </div>
    );
  }

  // STANDARD LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">Licensed Drug Suppliers</h3>
          <p className="text-xs text-slate-400">Manage licensed pharmaceutical wholesalers and supply partners.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register Wholesaler
        </button>
      </div>

      <CustomTable
        title="Active Drug Wholesalers"
        columns={columns}
        data={suppliers}
        searchKey="name"
        searchPlaceholder="Search suppliers by name..."
        filterOptions={[{ key: "status", label: "Status", options: ["ACTIVE", "INACTIVE"] }]}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedSupplierId(row.id)}
              className="p-1.5 text-slate-500 hover:text-brand bg-slate-50 hover:bg-brand/10 border border-slate-100 rounded-lg transition-all cursor-pointer"
              title="View Supplier Profile & Purchase History"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleOpenEdit(row, e)}
              className="p-1.5 text-slate-500 hover:text-brand bg-slate-50 hover:bg-brand/10 border border-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleOpenDelete(row.id, e)}
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
        title={editingSupplier ? "Edit Wholesaler Details" : "Register Wholesaler"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed font-semibold">
              Wholesalers must have valid legal GSTIN identification numbers and active status before they can be assigned to new drug procurement purchase orders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Wholesaler Name</label>
              <input
                type="text"
                placeholder="e.g. Novartis Distribution"
                {...register("name")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.name ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 font-semibold">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">GST Number</label>
              <input
                type="text"
                placeholder="e.g. 10AAACP1234F1Z1"
                {...register("gstNumber")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-mono uppercase ${
                  errors.gstNumber ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.gstNumber && <p className="text-xs text-red-500 font-semibold">{errors.gstNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email ID</label>
              <input
                type="email"
                placeholder="distribution@novartis.com"
                {...register("email")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.email ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.email && <p className="text-xs text-red-500 font-semibold">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
              <input
                type="text"
                placeholder="+1-555-0100"
                {...register("phone")}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                  errors.phone ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
                }`}
              />
              {errors.phone && <p className="text-xs text-red-500 font-semibold">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Warehouse Address</label>
            <input
              type="text"
              placeholder="Full physical dispatch warehouse address"
              {...register("address")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${
                errors.address ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-brand"
              }`}
            />
            {errors.address && <p className="text-xs text-red-500 font-semibold">{errors.address.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Supply Channel Status</label>
            <select
              {...register("status")}
              className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            >
              <option value="ACTIVE">ACTIVE (Authorized to place POs)</option>
              <option value="INACTIVE">INACTIVE (Frozen supply channel)</option>
            </select>
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
              {editingSupplier ? "Save Specifications" : "Register Wholesaler"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Supplier Account"
        message="Are you certain you want to remove this drug Wholesaler? Any completed Purchase Orders will retain this record, but no new orders can be dispatched to this supplier node."
      />
    </div>
  );
};

export default Suppliers;
