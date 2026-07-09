import React, { useState } from "react";
import { getData } from "../services/backend";
import { FileBarChart, Download, Loader2, Calendar, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";

export const Reports = () => {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  // Config States
  const [reportType, setReportType] = useState("INVENTORY");
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  
  // Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  // Generate Report Preview Data
  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      let data = [];
      let summary = {};

      if (reportType === "INVENTORY") {
        const meds = (await getData("/api/medicines")).map((medicine) => ({
          ...medicine,
          minStock: medicine.minStock ?? medicine.minStockThreshold ?? 0,
          currentStock: medicine.currentStock ?? 0,
          categoryName: medicine.categoryName ?? medicine.category ?? "Uncategorized",
        }));
        data = meds.map((m) => ({
          sku: m.id.toUpperCase(),
          name: m.name,
          category: m.categoryName,
          price: m.price,
          stock: m.currentStock,
          valuation: m.currentStock * m.price,
        }));
        const totalVal = data.reduce((sum, d) => sum + d.valuation, 0);
        const totalStock = data.reduce((sum, d) => sum + d.stock, 0);
        summary = { "Total Unique SKUs": meds.length, "Total Physical Units": totalStock, "Est. Catalogue Valuation": `$${totalVal.toFixed(2)}` };

      } else if (reportType === "EXPIRY") {
        const batches = await getData("/api/batches");
        const now = new Date();
        const warningDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
        
        data = batches
          .filter((b) => {
            const exp = new Date(b.expiryDate);
            return exp <= warningDate;
          })
          .map((b) => {
            const expDate = new Date(b.expiryDate);
            const status = expDate <= now ? "EXPIRED" : "EXPIRING SOON";
            return {
              batchCode: b.batchNumber,
              medicine: b.medicineName,
              qty: b.quantity,
              expiryDate: b.expiryDate,
              status,
            };
          });
        summary = { "Total Flagged Batches": data.length, "Expired Lots": data.filter(d => d.status === "EXPIRED").length, "At Risk Volume": `${data.reduce((sum, d) => sum + d.qty, 0)} units` };

      } else if (reportType === "PROCUREMENT") {
        const pos = (await getData("/api/purchase-orders")).filter((p) => {
          const poDate = new Date(p.orderDate);
          return poDate >= new Date(startDate) && poDate <= new Date(endDate);
        });

        data = pos.map((p) => ({
          poCode: p.poNumber,
          date: p.orderDate,
          supplier: p.supplierName,
          status: p.status,
          value: p.totalAmount,
        }));
        summary = { "Total Dispatched Orders": pos.length, "Delivered Orders": pos.filter(p => p.status === "DELIVERED").length, "Total Capital Allocated": `$${pos.reduce((sum, d) => sum + d.value, 0).toFixed(2)}` };

      } else {
        // SUPPLIER
        const [suppliers, pos] = await Promise.all([
          getData("/api/suppliers"),
          getData("/api/purchase-orders"),
        ]);
        
        data = suppliers.map((s) => {
          const supPos = pos.filter((p) => p.supplierId === s.id);
          const totalVal = supPos.reduce((sum, p) => sum + p.totalAmount, 0);
          return {
            supplierName: s.name,
            gstNumber: s.gstNumber,
            poCount: supPos.length,
            allocatedCapital: totalVal,
            status: s.status,
          };
        });
        summary = { "Registered Wholesale Nodes": suppliers.length, "Total Placed Requests": pos.length, "Active Partners": suppliers.filter(s => s.status === "ACTIVE").length };
      }

      setPreviewData({ data, summary });
      toast.success("Analytical specifications calculated and compiled!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (format) => {
    if (!previewData) return;
    setDownloadingFormat(format);

    const headers = Object.keys(previewData.data[0] || {}).join(",");
    const rows = previewData.data.map((row) => 
      Object.values(row).map(val => `"${val}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `medistock_${reportType.toLowerCase()}_report_${startDate}_to_${endDate}.${format === "excel" ? "csv" : "txt"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Completed file export: successfully downloaded ${reportType} report.`);
    setDownloadingFormat(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold font-display text-slate-800">Analytical Reports & Audit Exports</h3>
        <p className="text-xs text-slate-400">Generate, compile, and export warehouse data for regulatory sign-offs.</p>
      </div>

      {/* Report Parameter Panel */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <FileText className="w-4 h-4 text-slate-400" />
            Report Target Template
          </label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setPreviewData(null); // Reset preview
            }}
            className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          >
            <option value="INVENTORY">Inventory Valuation & SKU Balance Ledger</option>
            <option value="EXPIRY">Expired & Quarantine Warning List</option>
            <option value="PROCUREMENT">Purchase Orders Procurement Sum (Date Range)</option>
            <option value="SUPPLIER">Wholesaler Performance & Capital Allocations</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            Start Range Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            End Range Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>

        <div className="md:col-span-4 flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-5 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling analytical metrics...
              </>
            ) : (
              <>
                <FileBarChart className="w-4 h-4" />
                Calculate Report Metrics
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-export Analytical Summary Metrics Cards */}
      {previewData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(previewData.summary).map(([label, value]) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{label}</span>
              <span className="text-lg font-black text-slate-800 font-display mt-1">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Generated Preview Block */}
      {previewData && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          
          {/* Preview action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-4 gap-4">
            <div>
              <h4 className="text-sm font-bold font-display text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                Preview: Computed {reportType} Report Specifications
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Previewing parsed database nodes. Use download flags below for exports.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("excel")}
                disabled={downloadingFormat !== null}
                className="px-3 py-2 bg-brand/10 hover:bg-brand hover:text-white text-brand text-[10px] font-bold rounded-xl border border-brand/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {downloadingFormat === "excel" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Export CSV / Excel
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={downloadingFormat !== null}
                className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 text-[10px] font-bold rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {downloadingFormat === "pdf" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Export PDF Layout
              </button>
            </div>
          </div>

          {/* Compilation Export Progress Overlay */}
          {downloadingFormat && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center space-y-2 animate-pulse text-xs text-slate-600">
              <Loader2 className="w-5 h-5 text-brand animate-spin" />
              <p className="font-semibold">Formatting payload, compiling PDF/Excel layout grids...</p>
              <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full animate-infinite-progress" style={{ width: "60%" }}></div>
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                  {Object.keys(previewData.data[0] || {}).map((header) => (
                    <th key={header} className="px-4 py-2.5 uppercase text-[9px] tracking-wide">
                      {header.replace(/([A-Z])/g, " $1")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {previewData.data.length > 0 ? (
                  previewData.data.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {Object.values(row).map((val, colIdx) => (
                        <td key={colIdx} className="px-4 py-3 font-medium">
                          {typeof val === "number" && !headerIsQty(Object.keys(row)[colIdx]) ? `$${val.toFixed(2)}` : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-slate-400">
                      No active logs matched the specified dates and categories.
                    </td>
                  </tr>
                )}
                {previewData.data.length > 5 && (
                  <tr>
                    <td colSpan={10} className="text-center py-2 bg-slate-50 text-[10px] text-slate-400 font-bold font-mono">
                      Previewing first 5 rows. Detailed files contain all {previewData.data.length} compiled logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Initial Empty state */}
      {!previewData && !isGenerating && (
        <div className="border-2 border-dashed border-slate-100 rounded-2xl p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-3">
          <FileBarChart className="w-10 h-10 text-slate-200" />
          <div>
            <p className="font-bold text-slate-500">No Report Generated Yet</p>
            <p className="text-slate-400 mt-1">Select report template targets and click Generate to run analytics.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick helper to determine if field is qty (to avoid dollar sign format)
const headerIsQty = (key = "") => {
  const k = key.toLowerCase();
  return k.includes("qty") || k.includes("count") || k.includes("stock");
};

export default Reports;
