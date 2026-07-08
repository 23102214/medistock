import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";

export const CustomTable = ({
  columns,
  data = [],
  searchPlaceholder = "Search records...",
  searchKey = "name", // default search field
  filterOptions = [], // e.g. [{ key: "category", label: "Category", options: ["A", "B"] }]
  actions,
  rowKey = "id",
  initialRowsPerPage = 5,
  title
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Handle filter state changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setCurrentPage(1);
  };

  // 1. Filter and Search Data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search matching (case-insensitive)
      if (searchTerm) {
        // Support searching in multi-fields (if array) or single field
        const searchKeys = Array.isArray(searchKey) ? searchKey : [searchKey];
        const matchesSearch = searchKeys.some((key) => {
          const val = item[key];
          return val ? String(val).toLowerCase().includes(searchTerm.toLowerCase()) : false;
        });
        if (!matchesSearch) return false;
      }

      // Dropdown filter matching
      for (const [key, val] of Object.entries(filters)) {
        if (val && val !== "ALL") {
          const itemVal = item[key];
          if (itemVal === undefined || String(itemVal) !== String(val)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, searchTerm, searchKey, filters]);

  // 2. Sort Data
  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        const valA = typeof aVal === "string" ? aVal.toLowerCase() : aVal;
        const valB = typeof bVal === "string" ? bVal.toLowerCase() : bVal;

        if (valA < valB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // 3. Paginate Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;

  // Sorting request
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "";
      key = "";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Table Header Section */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {title && (
          <h4 className="text-lg font-bold font-display text-slate-800">
            {title} <span className="text-xs font-normal text-slate-400 ml-1">({sortedData.length} records)</span>
          </h4>
        )}
        <div className="flex flex-wrap items-center gap-2 md:ml-auto w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:flex-initial min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          {/* Toggle Filters Button */}
          {filterOptions.length > 0 && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`p-2 rounded-xl border text-sm flex items-center gap-1.5 transition-all ${
                showFiltersPanel || Object.keys(filters).some((k) => filters[k])
                  ? "bg-brand/10 border-brand text-brand font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          )}

          {/* Clear Filters Quick-Btn */}
          {(Object.keys(filters).some((k) => filters[k]) || searchTerm) && (
            <button
              onClick={clearFilters}
              className="p-2 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 rounded-xl transition-all flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filters Drawer/Panel */}
      {showFiltersPanel && filterOptions.length > 0 && (
        <div className="bg-slate-50/50 p-5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fadeIn">
          {filterOptions.map((filter) => (
            <div key={filter.key} className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {filter.label}
              </label>
              <select
                value={filters[filter.key] || "ALL"}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="ALL">All {filter.label}s</option>
                {filter.options.map((opt) => (
                  <option key={opt.value || opt} value={opt.value !== undefined ? opt.value : opt}>
                    {opt.label || opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Main Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && requestSort(col.key)}
                  className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer select-none hover:bg-slate-100" : ""
                  }`}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && sortConfig.key === col.key && (
                      sortConfig.direction === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-brand" />
                      )
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-36">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr key={row[rowKey] || idx} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 font-normal text-slate-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-slate-400">
                  <p className="text-base font-semibold">No records found</p>
                  <p className="text-xs mt-1">Try modifying your search or filter criteria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {[5, 10, 20, 50].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
          <span className="ml-2">
            Showing {sortedData.length ? (currentPage - 1) * rowsPerPage + 1 : 0} to{" "}
            {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} records
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {Array.from({ length: totalPages }, (_, idx) => idx + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((page, idx, arr) => {
              const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
              return (
                <React.Fragment key={page}>
                  {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === page
                        ? "bg-brand text-white shadow-sm shadow-brand/20"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomTable;
