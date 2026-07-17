import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getData, postData, putData } from "../services/backend";
import StatCard from "../components/StatCard";
import {
  Pill,
  Users,
  Truck,
  AlertTriangle,
  CalendarDays,
  FileCheck2,
  BellRing,
  PlusCircle,
  ShieldCheck,
  Activity,
  ArrowRight,
  ShieldAlert,
  Archive,
  RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Real-time state
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [batches, setBatches] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifCount, setNotifCount] = useState(0);

  const loadDashboardData = async () => {
    try {
      const [meds, sups, usr, bat, pos, systemLogs, notifs] = await Promise.all([
        getData("/api/medicines"),
        getData("/api/suppliers"),
        getData("/api/users"),
        getData("/api/batches"),
        getData("/api/purchase-orders"),
        getData("/api/system-logs"),
        getData("/api/notifications"),
      ]);

      setMedicines(meds.map((medicine) => ({
        ...medicine,
        minStock: medicine.minStock ?? medicine.minStockThreshold ?? 0,
        currentStock: medicine.currentStock ?? 0,
        categoryName: medicine.categoryName ?? medicine.category ?? "Uncategorized",
      })));
      setSuppliers(sups);
      setUsersCount(usr.length);
      setBatches(bat);
      setPurchaseOrders(pos);
      setLogs(systemLogs.slice(0, 5));
      setNotifCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load dashboard data");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Recalculate KPIs
  const kpis = useMemo(() => {
    const totalMeds = medicines.length;
    const totalSups = suppliers.length;
    
    // Low stock count (current stock across batches <= minStock)
    const lowStockCount = medicines.filter(m => m.currentStock <= m.minStock).length;

    // Expired or expiring within 60 days
    const now = new Date();
    const expiringSoonCount = batches.filter(b => {
      const exp = new Date(b.expiryDate);
      const diffTime = exp - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 60; // Expired or expiring soon
    }).length;

    // Active PO count
    const activePoCount = purchaseOrders.filter(p => p.status === "PENDING" || p.status === "APPROVED").length;

    return {
      totalMeds,
      totalSups,
      lowStockCount,
      expiringSoonCount,
      activePoCount
    };
  }, [medicines, suppliers, batches, purchaseOrders]);

  // --- RECHARTS CHART DATA COMPILATION ---

  // 1. Inventory by Category Distribution
  const categoryChartData = useMemo(() => {
    const counts = {};
    medicines.forEach(m => {
      counts[m.categoryName] = (counts[m.categoryName] || 0) + m.currentStock;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [medicines]);

  const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#0369a1", "#0284c7", "#bae6fd"];

  // 2. Low Stock Trends (Current Stock vs Minimum Threshold)
  const stockComparisonData = useMemo(() => {
    return medicines.slice(0, 5).map(m => ({
      name: m.name.split(" ")[0], // short name
      Current: m.currentStock,
      Minimum: m.minStock
    }));
  }, [medicines]);

  // 3. Expiry Risk Profile Chart Data
  const expiryProfileData = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let critical = 0; // <30 days
    let soon = 0; // <60 days
    let safe = 0;

    batches.forEach(b => {
      const expDate = new Date(b.expiryDate);
      const diffTime = expDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expired++;
      } else if (diffDays <= 30) {
        critical++;
      } else if (diffDays <= 60) {
        soon++;
      } else {
        safe++;
      }
    });

    return [
      { name: "Expired", count: expired, fill: "#ef4444" },
      { name: "Urgent (<30d)", count: critical, fill: "#f97316" },
      { name: "Warning (<60d)", count: soon, fill: "#eab308" },
      { name: "Safe", count: safe, fill: "#10b981" }
    ];
  }, [batches]);

  const purchaseTrendsData = useMemo(() => {
    const totalsByMonth = purchaseOrders.reduce((acc, order) => {
      if (!order.orderDate) return acc;
      const date = new Date(order.orderDate);
      if (Number.isNaN(date.getTime())) return acc;
      const key = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
      acc[key] = (acc[key] || 0) + (Number(order.totalAmount) || 0);
      return acc;
    }, {});

    return Object.entries(totalsByMonth).map(([name, volume]) => ({ name, volume }));
  }, [purchaseOrders]);

  // Quick Action: Quarantine Batch (remove expired batch quantity)
  const handleQuarantine = async (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      const qQty = batch.quantity;
      try {
        await putData(`/api/batches/${batch.id}`, { ...batch, quantity: 0 });
        await postData("/api/transactions", {
        date: new Date().toISOString().split('T')[0],
        type: "EXPIRED",
        medicineId: batch.medicineId,
        quantity: qQty,
        batchNumber: batch.batchNumber,
        remarks: `Quarantined batch ${batch.batchNumber} directly from Dashboard.`
      });
        toast.success(`Quarantined expired batch ${batch.batchNumber}`);
        await loadDashboardData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to quarantine batch");
      }
    }
  };

  // Find expired batches to flag in warning panel
  const expiredBatches = useMemo(() => {
    const now = new Date();
    return batches.filter(b => {
      const exp = new Date(b.expiryDate);
      return exp <= now && b.quantity > 0;
    });
  }, [batches]);

  // Find low stock items list
  const lowStockMeds = useMemo(() => {
    return medicines.filter(m => m.currentStock <= m.minStock);
  }, [medicines]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Clinical Inventory Dashboard
          </h2>
          <p className="text-xs text-slate-400">
            Welcome back, <span className="font-bold text-brand">{user?.fullName}</span>. Role authorization: <span className="font-bold text-slate-500 uppercase tracking-wide">{user?.role}</span>
          </p>
        </div>

        {user?.role !== "STAFF" && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-brand bg-white dark:bg-slate-900 dark:border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Synchronize DB
            </button>
            
            <button
              onClick={() => navigate("/orders")}
              className="px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-extrabold shadow-md shadow-brand/10 hover:bg-brand-hover hover:shadow-brand/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              New Purchase Order
            </button>
          </div>
        )}
      </div>

      {/* KPI GRID STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Medicines"
          value={kpis.totalMeds}
          icon={Pill}
          subtitle="Unique SKU items logged"
          color="brand"
          onClick={() => navigate("/medicines")}
        />
        <StatCard
          title="Low Stock Items"
          value={kpis.lowStockCount}
          icon={AlertTriangle}
          subtitle="Below safety thresholds"
          color={kpis.lowStockCount > 0 ? "yellow" : "green"}
          onClick={() => navigate("/medicines")}
        />
        <StatCard
          title="Expiring Soon"
          value={kpis.expiringSoonCount}
          icon={CalendarDays}
          subtitle="Batches <= 60 days to expiry"
          color={kpis.expiringSoonCount > 0 ? "red" : "green"}
          onClick={() => navigate("/batches")}
        />
        <StatCard
          title="Active Orders"
          value={kpis.activePoCount}
          icon={FileCheck2}
          subtitle="Pending/Approved orders"
          color="blue"
          onClick={() => navigate("/orders")}
        />
      </div>

      {/* CHARTS BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Inventory Share (Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
            <h4 className="text-sm font-bold font-display text-slate-700 dark:text-slate-300">
              Inventory Share by Category
            </h4>
            <p className="text-[10px] text-slate-400">Total physical item distribution</p>
          </div>
          <div className="h-64">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} units`} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                No inventory logs found to generate distribution chart.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Safety Margin Compare (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
            <h4 className="text-sm font-bold font-display text-slate-700 dark:text-slate-300">
              Stock Levels vs safety limits
            </h4>
            <p className="text-[10px] text-slate-400">Comparing current volumes to safety thresholds</p>
          </div>
          <div className="h-64">
            {stockComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="Current" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Minimum" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                No active SKUs available to construct comparison.
              </div>
            )}
          </div>
        </div>

        {/* Purchase Orders Monthly Trends (Area Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
            <h4 className="text-sm font-bold font-display text-slate-700 dark:text-slate-300">
              Monthly Purchase Values
            </h4>
            <p className="text-[10px] text-slate-400">Total procurement order investment trend</p>
          </div>
          <div className="h-64">
            {purchaseTrendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={purchaseTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="procureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value) => `$${value}`} />
                  <Area type="monotone" dataKey="volume" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#procureGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                No purchase orders available to generate procurement trends.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ROW 3: DETAILED ALERTS AND REAL-TIME AUDIT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Expiry and Safety Alert Feed (2 columns if Admin, 3 columns if Pharmacist) */}
        <div className={`space-y-6 ${user?.role === "ADMIN" ? "lg:col-span-2" : "lg:col-span-3"}`}>
          
          {/* CRITICAL BATCH EXPIRY WARNINGS PANEL */}
          {expiredBatches.length > 0 && (
            <div className="bg-red-50/75 border border-red-150 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-red-700 mb-3 border-b border-red-200 pb-2">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                <h4 className="font-extrabold font-display text-xs uppercase tracking-wider">
                  Critical Quarantine Action Required
                </h4>
                <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {expiredBatches.length} Batches Expired
                </span>
              </div>
              
              <div className="space-y-2.5">
                {expiredBatches.slice(0, 3).map((bat) => (
                  <div key={bat.id} className="bg-white/80 border border-red-100 p-3 rounded-xl flex items-center justify-between text-xs transition-all hover:bg-white">
                    <div>
                      <p className="font-bold text-slate-800">{bat.medicineName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Batch: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{bat.batchNumber}</span> | Expired on: <span className="font-semibold text-red-600">{bat.expiryDate}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-right text-xs font-bold text-red-500">{bat.quantity} units</span>
                      <button
                        onClick={() => handleQuarantine(bat.id)}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg shadow transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Quarantine
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REAL-TIME LOW STOCK ORDERING HELPER */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
              <div>
                <h4 className="text-sm font-bold font-display text-slate-700">
                  Critical Inventory Re-stock Center
                </h4>
                <p className="text-[10px] text-slate-400">Real-time depletion tracking</p>
              </div>
              <span className="text-xs bg-amber-50 text-amber-600 font-bold px-2.5 py-1 rounded-full border border-amber-100">
                {lowStockMeds.length} Low Stock SKUs
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {lowStockMeds.length > 0 ? (
                lowStockMeds.slice(0, 4).map((med) => (
                  <div key={med.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{med.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Supplier: {med.supplierName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block font-bold text-amber-500 text-xs">{med.currentStock} units</span>
                        <span className="text-[10px] text-slate-400">Min: {med.minStock}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/orders?reorder=${med.id}`)}
                        className="px-3 py-1.5 bg-brand/10 hover:bg-brand text-brand hover:text-white text-[10px] font-bold rounded-lg border border-brand/20 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Procure
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  All logged SKUs are currently above safe minimum stock.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ADMIN SECURITY LOGS & SYSTEM AUDITS FEED (Admin only, hidden for staff) */}
        {user?.role === "ADMIN" && (
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 border-b border-slate-50 pb-3 mb-4 text-brand">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <h4 className="text-sm font-bold font-display text-slate-700">
                  System Audits & Security Logs
                </h4>
              </div>

              <div className="space-y-3.5">
                {logs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1 hover:bg-slate-50 p-2 rounded-xl transition-all border border-transparent hover:border-slate-100">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-700 font-mono text-[10px] bg-slate-150 px-1.5 py-0.5 rounded uppercase">
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[9px] font-normal">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium leading-tight">{log.details}</p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 font-semibold">
                      <span>Term: <strong className="text-slate-500">{log.user}</strong></span>
                      <span>•</span>
                      <span>IP: <strong className="text-slate-500">{log.ip}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <button
                onClick={() => navigate("/users")}
                className="text-[10px] font-bold text-brand hover:text-brand-hover inline-flex items-center gap-1 bg-brand-light px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                Manage Active Terminals
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
