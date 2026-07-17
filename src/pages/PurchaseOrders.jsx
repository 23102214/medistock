import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useLocation, useNavigate } from "react-router-dom";
import { getData, postData, putData } from "../services/backend";
import CustomTable from "../components/CustomTable";
import Modal from "../components/Modal";
import { Plus, Eye, Receipt, FilePlus, Trash2, Check, X, ShieldCheck, ShoppingCart } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Schema validation for Purchase Order Form
const poSchema = yup.object().shape({
  supplierId: yup.string().required("Supplier selection is required"),
  items: yup
    .array()
    .of(
      yup.object().shape({
        medicineId: yup.string().required("Medicine SKU selection is required"),
        quantity: yup
          .number()
          .typeError("Qty must be an integer")
          .integer("Must be a whole number")
          .min(1, "Qty must be at least 1 unit")
          .required("Quantity is required"),
        unitPrice: yup
          .number()
          .typeError("Price must be a decimal")
          .positive("Price must be positive")
          .required("Price is required"),
      })
    )
    .min(1, "Purchase Order must contain at least one item listing"),
});

export const PurchaseOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic Lists
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null); // invoice detail view

  const loadAllData = async () => {
    try {
      const [orderRows, supplierRows, medicineRows] = await Promise.all([
        getData("/api/purchase-orders"),
        getData("/api/suppliers"),
        getData("/api/medicines"),
      ]);
      setPurchaseOrders(orderRows);
      setSuppliers(supplierRows);
      setMedicines(medicineRows.map((medicine) => ({
        ...medicine,
        minStock: medicine.minStock ?? medicine.minStockThreshold ?? 0,
      })));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load purchase orders");
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // React Hook Form for creation
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(poSchema),
    defaultValues: {
      supplierId: "",
      items: [{ medicineId: "", quantity: "", unitPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Dynamic Total calculation
  const watchItems = watch("items");
  const orderTotal = useMemo(() => {
    if (!watchItems) return 0;
    return watchItems.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0;
      const price = Number(curr.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
  }, [watchItems]);

  // Handle reorder query parameters (?reorder=med-1)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const reorderId = searchParams.get("reorder");
    if (reorderId && medicines.length > 0) {
      const med = medicines.find((m) => m.id === reorderId);
      if (med) {
        // Clear query parameters
        navigate(location.pathname, { replace: true });
        
        // Setup default values and open modal
        reset({
          supplierId: med.supplierId || "",
          items: [{
            medicineId: med.id,
            quantity: med.minStock ? med.minStock * 2 : "",
            unitPrice: med.price ?? "",
          }],
        });
        setIsCreateOpen(true);
        toast.info(`Pre-configured reorder parameters for ${med.name}`);
      }
    }
  }, [location, medicines, reset, navigate]);

  // Handle PO Creation Submit
  const onCreateSubmit = async (data) => {
    const sup = suppliers.find((s) => s.id === data.supplierId);
    const firstItem = data.items[0];
    const med = medicines.find((m) => m.id === firstItem.medicineId);

    if (!sup || !med) {
      toast.error("Select a supplier and medicine from backend records before creating a purchase order.");
      return;
    }

    try {
      const created = await postData("/api/purchase-orders", {
        supplierId: data.supplierId,
        supplierName: sup.name,
        medicineName: med.name,
        quantity: Number(firstItem.quantity),
        unitPrice: Number(firstItem.unitPrice),
        createdBy: user?.username || "system",
      });
      toast.success(`Purchase Order ${created.poNumber} created successfully!`);
      await loadAllData();
      setIsCreateOpen(false);
      reset({
        supplierId: "",
        items: [{ medicineId: "", quantity: "", unitPrice: "" }],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create purchase order");
    }
  };

  // Change PO Lifecycle Status
  const handleUpdateStatus = async (poId, nextStatus) => {
    const action = nextStatus === "APPROVED" ? "approve" : nextStatus === "DELIVERED" ? "receive" : "reject";
    try {
      const updated = await putData(`/api/purchase-orders/${poId}/${action}`, {});
      toast.info(`Purchase Order updated to ${nextStatus}`);
      await loadAllData();
      setSelectedPo(updated);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update purchase order");
    }
  };

  // Define Main Columns
  const columns = [
    {
      key: "poNumber",
      label: "PO Number",
      sortable: true,
      render: (row) => <span className="font-bold text-slate-800">{row.poNumber}</span>,
    },
    {
      key: "supplierName",
      label: "Supplier Node",
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-600 block max-w-[180px] truncate">{row.supplierName}</span>,
    },
    {
      key: "orderDate",
      label: "Placed Date",
      sortable: true,
    },
    {
      key: "totalAmount",
      label: "Order Value",
      sortable: true,
      render: (row) => <span className="font-bold text-brand">${row.totalAmount.toFixed(2)}</span>,
    },
    {
      key: "status",
      label: "PO Status",
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
            row.status === "DELIVERED"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : row.status === "APPROVED"
              ? "bg-sky-50 text-sky-600 border border-sky-100"
              : row.status === "CANCELLED"
              ? "bg-red-50 text-red-600 border border-red-100"
              : "bg-amber-50 text-amber-600 border border-amber-100"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800">Procurement & Purchase Orders</h3>
          <p className="text-xs text-slate-400">Order medication lots and manage supply pipeline acquisitions.</p>
        </div>

        <button
          onClick={() => {
            reset({
              supplierId: "",
              items: [{ medicineId: "", quantity: "", unitPrice: "" }],
            });
            setIsCreateOpen(true);
          }}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <ShoppingCart className="w-4 h-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Orders list */}
      <CustomTable
        title="Drug Procurement Orders"
        columns={columns}
        data={purchaseOrders}
        searchKey="poNumber"
        searchPlaceholder="Search PO codes..."
        filterOptions={[{ key: "status", label: "Status", options: ["PENDING", "APPROVED", "DELIVERED", "CANCELLED"] }]}
        actions={(row) => (
          user?.role === "ADMIN" && (
            <button
              onClick={() => setSelectedPo(row)}
              className="p-1.5 text-slate-500 hover:text-brand bg-slate-50 hover:bg-brand/10 border border-slate-100 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <Eye className="w-3.5 h-3.5" />
              Invoice
            </button>
          )
        )}
      />

      {/* CREATE MULTI-MEDICINE PO MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Drug Purchase Order" size="xl">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
          <div className="bg-brand-light p-3.5 rounded-2xl flex gap-2.5 text-xs text-brand-dark border border-brand/10">
            <FilePlus className="w-5 h-5 shrink-0 animate-pulse" />
            <p className="leading-relaxed font-semibold">
              Fill out procurement rows below. Dispatched orders go to PENDING. Approval by designated executives can follow.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Wholesaler</label>
            <select
              {...register("supplierId")}
              className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            >
              <option value="">Choose Supplier Wholesaler...</option>
              {suppliers.filter((s) => s.status === "ACTIVE").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
            {errors.supplierId && <p className="text-xs text-red-500 font-semibold">{errors.supplierId.message}</p>}
          </div>

          {/* DYNAMIC ROWS ARRAY FOR MULTI PRODUCTS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Procured Medication Lots</span>
              <button
                type="button"
                onClick={() => append({ medicineId: "", quantity: "", unitPrice: "" })}
                className="px-3 py-1.5 text-[10px] font-bold text-brand bg-brand-light hover:bg-brand hover:text-white rounded-lg transition-all cursor-pointer"
              >
                + Add Another Drug
              </button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative">
                
                {/* Product Name SKU Select */}
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Medication SKU</label>
                  <select
                    {...register(`items.${index}.medicineId`)}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Choose Medication...</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Procured Quantity */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    {...register(`items.${index}.quantity`)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand text-right"
                  />
                </div>

                {/* Wholesale Cost Unit Price */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Wholesale Cost ($)</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    {...register(`items.${index}.unitPrice`)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand text-right"
                  />
                </div>

                {/* Remove row button */}
                <div className="md:col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => fields.length > 1 ? remove(index) : toast.warn("Orders must contain at least 1 item.")}
                    className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl border border-slate-150 shadow-sm transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
            {errors.items && <p className="text-xs text-red-500 font-semibold">{errors.items.message}</p>}
          </div>

          {/* Summary Box */}
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
            <span className="text-xs font-bold text-slate-500">Gross Procurement Cost:</span>
            <span className="text-lg font-extrabold text-brand font-display">${orderTotal.toFixed(2)}</span>
          </div>

          <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Dispatch Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS & LIFECYCLE INVOICE CARD */}
      <Modal isOpen={!!selectedPo} onClose={() => setSelectedPo(null)} title="Purchase Order Specifications" size="lg">
        {selectedPo && (
          <div className="space-y-6">
            {/* Header Stamp */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Procurement Code</span>
                <h4 className="text-lg font-bold text-slate-800">{selectedPo.poNumber}</h4>
              </div>

              <div className="flex flex-col text-right sm:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Approval Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block mt-1 ${
                    selectedPo.status === "DELIVERED"
                      ? "bg-emerald-50 text-emerald-600"
                      : selectedPo.status === "APPROVED"
                      ? "bg-sky-50 text-sky-600"
                      : selectedPo.status === "CANCELLED"
                      ? "bg-red-50 text-red-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {selectedPo.status}
                </span>
              </div>
            </div>

            {/* General properties */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-slate-400 uppercase text-[9px]">Supplier Node Wholesaler</p>
                <p className="font-bold text-slate-700">{selectedPo.supplierName}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="font-bold text-slate-400 uppercase text-[9px]">Dates</p>
                <p className="text-slate-500">Order: <span className="font-semibold text-slate-700">{selectedPo.orderDate}</span></p>
                {selectedPo.deliveryDate && (
                  <p className="text-emerald-500 font-semibold mt-0.5">Recv: {selectedPo.deliveryDate}</p>
                )}
              </div>
            </div>

            {/* Items Table inside Invoice */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                    <th className="px-4 py-2.5">Medication SKU Name</th>
                    <th className="px-4 py-2.5 text-right">Qty ordered</th>
                    <th className="px-4 py-2.5 text-right">Unit Wholesale Cost</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {selectedPo.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-bold text-slate-700">{item.medicineName}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.quantity} units</td>
                      <td className="px-4 py-3 text-right font-medium">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-brand">${Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/70 font-bold text-sm">
                    <td colSpan={3} className="px-4 py-3 text-right text-slate-500">Invoice Sum total:</td>
                    <td className="px-4 py-3 text-right text-brand font-display font-extrabold">${selectedPo.totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* LIFECYCLE WORKFLOW TRIGGER BUTTONS (Only PENDING -> APPROVED -> DELIVERED) */}
            {selectedPo.status !== "DELIVERED" && selectedPo.status !== "CANCELLED" && (
              <div className="pt-4 border-t border-slate-50 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Executive Workflow Sign-Off
                </p>
                <div className="flex items-center gap-2.5">
                  {selectedPo.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedPo.id, "CANCELLED")}
                        className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Cancel Order
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedPo.id, "APPROVED")}
                        className="flex-1 py-2 rounded-xl bg-brand text-white hover:bg-brand-hover text-xs font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Approve Order
                      </button>
                    </>
                  )}

                  {selectedPo.status === "APPROVED" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPo.id, "DELIVERED")}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Sign-Off Received (Receiving Batch Stocks)
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPo(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
              >
                Close Invoice View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
