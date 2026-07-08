import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getData, putData } from "../services/backend";
import {
  LayoutDashboard,
  Pill,
  Layers,
  Tags,
  Truck,
  FileText,
  ArrowUpDown,
  BarChart3,
  Bell,
  Users,
  User,
  LogOut,
  Search,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("medistock_dark") === "true");
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  // Global Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const searchRef = useRef(null);

  // Reload Notifications
  const loadNotifications = async () => {
    try {
      setNotifications(await getData("/api/notifications"));
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Refresh alerts every 10 seconds to keep track of new mock stock outputs
    const timer = setInterval(() => {
      loadNotifications();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply dark mode classes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("medistock_dark", "true");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("medistock_dark", "false");
    }
  }, [darkMode]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id) => {
    await putData(`/api/notifications/${id}/read`, {});
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await putData("/api/notifications/read-all", {});
    await loadNotifications();
    toast.success("All notifications marked as read");
  };

  // Global Search Engine
  const handleGlobalSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const [medicines, batches, categories, suppliers] = await Promise.all([
      getData("/api/medicines"),
      getData("/api/batches"),
      getData("/api/categories"),
      getData("/api/suppliers"),
    ]);

    const matchedMeds = medicines.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
    const matchedBatches = batches.filter(b => b.batchNumber.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
    const matchedCats = categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 2);
    const matchedSups = suppliers.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 2);

    setSearchResults({
      medicines: matchedMeds,
      batches: matchedBatches,
      categories: matchedCats,
      suppliers: matchedSups,
      any: matchedMeds.length > 0 || matchedBatches.length > 0 || matchedCats.length > 0 || matchedSups.length > 0
    });
  };

  const handleSearchResultClick = (path) => {
    setSearchQuery("");
    setSearchResults(null);
    navigate(path);
  };

  // Sidebar Menu Config
  const menuItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["ADMIN", "PHARMACIST", "STAFF"] },
    { label: "Medicines", path: "/medicines", icon: Pill, roles: ["ADMIN", "PHARMACIST", "STAFF"] },
    { label: "Medicine Batches", path: "/batches", icon: Layers, roles: ["ADMIN", "PHARMACIST"] },
    { label: "Categories", path: "/categories", icon: Tags, roles: ["ADMIN", "PHARMACIST"] },
    { label: "Suppliers", path: "/suppliers", icon: Truck, roles: ["ADMIN", "PHARMACIST"] },
    { label: "Purchase Orders", path: "/orders", icon: FileText, roles: ["ADMIN", "PHARMACIST"] },
    { label: "Inventory Logs", path: "/inventory", icon: ArrowUpDown, roles: ["ADMIN", "PHARMACIST", "STAFF"] },
    { label: "Reports Center", path: "/reports", icon: BarChart3, roles: ["ADMIN", "PHARMACIST"] },
    { label: "User Management", path: "/users", icon: Users, roles: ["ADMIN"] },
    { label: "My Profile", path: "/profile", icon: User, roles: ["ADMIN", "PHARMACIST", "STAFF"] }
  ];

  // Filters menu by user role
  const allowedMenuItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className={`min-h-screen flex ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      
      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0f172a] text-[#94a3b8] border-r border-slate-800 shrink-0 select-none shadow-xl transition-all duration-300">
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-lg shadow-sm">
            M
          </div>
          <div>
            <h1 className="font-bold font-display tracking-tight text-white text-lg leading-tight" style={{ letterSpacing: "-0.5px" }}>MediStock</h1>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-800/60 px-2 py-0.5 rounded">
              {user?.role} Portal
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          {allowedMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium border-l-4 transition-all duration-200 ${
                  isActive
                    ? "bg-white/5 text-white border-brand font-semibold"
                    : "text-slate-400 border-transparent hover:text-white hover:bg-white/2"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? "text-brand" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar Controls */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/20">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 text-xs text-slate-300 border border-slate-800/50">
            <span className="flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-amber-300" /> : <Sun className="w-4 h-4 text-amber-100" />}
              Dark Mode
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-700 transition-colors focus:outline-none cursor-pointer"
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  darkMode ? "translate-x-4.5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => {
              logout();
              toast.info("Logged out successfully");
            }}
            className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/15 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-[#0f172a] text-[#94a3b8] h-full shadow-2xl animate-slideRight">
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  M
                </div>
                <h1 className="font-bold font-display tracking-tight text-white text-md">MediStock</h1>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
              {allowedMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium border-l-4 transition-all duration-200 ${
                      isActive
                        ? "bg-white/5 text-white border-brand font-semibold"
                        : "text-slate-400 border-transparent hover:text-white hover:bg-white/2"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/20">
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                  toast.info("Logged out successfully");
                }}
                className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/15 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        
        {/* HEADER NAVBAR */}
        <header className={`h-20 shrink-0 border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white"
        }`}>
          {/* Mobile Toggle & Path */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h2 className={`text-md font-bold font-display ${darkMode ? "text-slate-100" : "text-slate-700"}`}>
                {allowedMenuItems.find((i) => i.path === location.pathname)?.label || "MediStock Panel"}
              </h2>
              <p className="text-[10px] text-slate-400">Inventory Management Portal</p>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-4 flex-1 justify-end max-w-lg lg:max-w-xl ml-auto">
            
            {/* GLOBAL SEARCH BAR */}
            <div className="relative w-full max-w-[280px]" ref={searchRef}>
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Global search..."
                value={searchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all ${
                  darkMode ? "bg-slate-800 border-slate-700 text-slate-100" : ""
                }`}
              />

              {/* Search Dropdown Panel */}
              {searchResults && (
                <div className={`absolute top-full right-0 mt-2 w-72 rounded-2xl shadow-xl border border-slate-100 py-3 z-50 overflow-hidden text-xs max-h-96 overflow-y-auto animate-fadeIn ${
                  darkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white text-slate-700"
                }`}>
                  {!searchResults.any ? (
                    <p className="p-4 text-center text-slate-400">No match found</p>
                  ) : (
                    <>
                      {searchResults.medicines.length > 0 && (
                        <div>
                          <p className="px-4 py-1 font-bold bg-slate-50 text-[10px] uppercase text-slate-400 dark:bg-slate-800">Medicines</p>
                          <div className="py-1">
                            {searchResults.medicines.map(m => (
                              <div
                                key={m.id}
                                onClick={() => handleSearchResultClick(`/medicines?search=${m.name}`)}
                                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between"
                              >
                                <span className="font-medium">{m.name}</span>
                                <span className="text-[10px] text-slate-400">{m.categoryName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.batches.length > 0 && (
                        <div>
                          <p className="px-4 py-1 font-bold bg-slate-50 text-[10px] uppercase text-slate-400 dark:bg-slate-800">Batches</p>
                          <div className="py-1">
                            {searchResults.batches.map(b => (
                              <div
                                key={b.id}
                                onClick={() => handleSearchResultClick(`/batches?search=${b.batchNumber}`)}
                                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between"
                              >
                                <span className="font-semibold">{b.batchNumber}</span>
                                <span className="text-[10px] text-red-400">Exp: {b.expiryDate}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.categories.length > 0 && (
                        <div>
                          <p className="px-4 py-1 font-bold bg-slate-50 text-[10px] uppercase text-slate-400 dark:bg-slate-800">Categories</p>
                          <div className="py-1">
                            {searchResults.categories.map(c => (
                              <div
                                key={c.id}
                                onClick={() => handleSearchResultClick(`/categories?search=${c.name}`)}
                                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <span className="font-medium">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.suppliers.length > 0 && (
                        <div>
                          <p className="px-4 py-1 font-bold bg-slate-50 text-[10px] uppercase text-slate-400 dark:bg-slate-800">Suppliers</p>
                          <div className="py-1">
                            {searchResults.suppliers.map(s => (
                              <div
                                key={s.id}
                                onClick={() => handleSearchResultClick(`/suppliers?search=${s.name}`)}
                                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <span className="font-medium">{s.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all ${
                  showNotifDropdown ? "bg-slate-100" : ""
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className={`absolute top-full right-0 mt-2 w-80 rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-fadeIn ${
                  darkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white text-slate-700"
                }`}>
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <h5 className="font-bold text-sm">System Alerts</h5>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold text-brand hover:text-brand-hover flex items-center gap-1 bg-brand-light px-2 py-0.5 rounded-full transition-all cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id)}
                          className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                            !notif.read ? "bg-brand-light/20 font-medium" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                              notif.type === "LOW_STOCK" ? "text-amber-500" : notif.type === "EXPIRY" ? "text-red-500" : "text-brand"
                            }`} />
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{notif.title}</p>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{notif.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">{notif.date}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-6 text-center text-slate-400 text-xs">No notifications available</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* GEAR ICON */}
            <button
              onClick={() => navigate("/profile")}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* USER AVATAR */}
            <div
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2.5 pl-3 border-l border-slate-100 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-teal-500 text-white font-bold flex items-center justify-center border border-teal-400 shadow-sm overflow-hidden relative">
                <span className="text-sm font-semibold">{user?.fullName?.substring(0, 2).toUpperCase() || "JD"}</span>
              </div>
              <div className="hidden md:block text-left leading-tight">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand transition-colors">
                  {user?.fullName || "Guest User"}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                  {user?.role || "STAFF"}
                </p>
              </div>
            </div>

          </div>
        </header>

        {/* CONTENT CANVAS AREA */}
        <main className={`flex-1 p-6 ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        {/* FOOTER */}
        <footer className={`py-4 px-6 border-t border-slate-150 text-center text-[10px] font-semibold text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white"
        }`}>
          <span>&copy; {new Date().getFullYear()} MediStock Ltd. All rights reserved.</span>
          <span className="bg-brand-light text-brand dark:bg-brand-dark/20 dark:text-brand px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold">
            Clinical System Core v1.4.0
          </span>
        </footer>

      </div>
    </div>
  );
};

export default DashboardLayout;
