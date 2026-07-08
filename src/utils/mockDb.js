/**
 * MediStock Simulated PostgreSQL Database & Audit Logs in LocalStorage
 */

const DEFAULT_USERS = [
  {
    id: "usr-1",
    username: "admin",
    email: "admin@medistock.com",
    fullName: "Jeo Alwin (Admin)",
    role: "ADMIN",
    status: "ACTIVE",
    joinedDate: "2025-01-15"
  },
  {
    id: "usr-2",
    username: "pharmacist",
    email: "pharmacist@medistock.com",
    fullName: "Dr. Sathya (Pharmacist)",
    role: "PHARMACIST",
    status: "ACTIVE",
    joinedDate: "2025-02-10"
  },
  {
    id: "usr-3",
    username: "staff",
    email: "staff@medistock.com",
    fullName: "Dr. Priya (Staff)",
    role: "STAFF",
    status: "ACTIVE",
    joinedDate: "2025-03-01"
  }
];

const DEFAULT_CATEGORIES = [
  { id: "cat-1", name: "Antibiotics", description: "Inhibit growth or destroy microorganisms" },
  { id: "cat-2", name: "Analgesics", description: "Pain relief medications" },
  { id: "cat-3", name: "Cardiovascular", description: "Heart and blood pressure management" },
  { id: "cat-4", name: "Antidiabetics", description: "Blood glucose regulators" },
  { id: "cat-5", name: "Vitamins & Supplements", description: "Nutritional supplements and health boosters" }
];

const DEFAULT_SUPPLIERS = [
  { id: "sup-1", name: "Pfizer Pharmaceuticals", email: "pfizer@medistock.com", phone: "+1-555-0190", address: "Hudson Yards, New York, NY", gstNumber: "10AAACP1234F1Z1", status: "ACTIVE" },
  { id: "sup-2", name: "Novartis AG", email: "novartis@medistock.com", phone: "+41-61-324-1111", address: "Lichtstrasse, Basel, Switzerland", gstNumber: "12BBBDF5678A2Y2", status: "ACTIVE" },
  { id: "sup-3", name: "Bayer Healthcare", email: "bayer@medistock.com", phone: "+49-214-30-1", address: "Kaiser-Wilhelm-Allee, Leverkusen, Germany", gstNumber: "14CCCGG9012B3X3", status: "ACTIVE" },
  { id: "sup-4", name: "Roche Diagnostics", email: "roche@medistock.com", phone: "+41-61-688-1111", address: "Grenzacherstrasse, Basel, Switzerland", gstNumber: "16DDDHJ3456C4W4", status: "INACTIVE" }
];

const DEFAULT_MEDICINES = [
  { id: "med-1", name: "Amoxicillin 500mg", categoryId: "cat-1", categoryName: "Antibiotics", supplierId: "sup-1", supplierName: "Pfizer Pharmaceuticals", price: 12.50, minStock: 100, description: "Broad-spectrum penicillin antibiotic used for bacterial infections.", currentStock: 250 },
  { id: "med-2", name: "Paracetamol 650mg", categoryId: "cat-2", categoryName: "Analgesics", supplierId: "sup-2", supplierName: "Novartis AG", price: 4.20, minStock: 200, description: "Common analgesic and antipyretic drug for pain and fever relief.", currentStock: 50 },
  { id: "med-3", name: "Atorvastatin 20mg", categoryId: "cat-3", categoryName: "Cardiovascular", supplierId: "sup-1", supplierName: "Pfizer Pharmaceuticals", price: 25.00, minStock: 50, description: "HMG-CoA reductase inhibitor used to lower high cholesterol levels.", currentStock: 120 },
  { id: "med-4", name: "Metformin 500mg", categoryId: "cat-4", categoryName: "Antidiabetics", supplierId: "sup-3", supplierName: "Bayer Healthcare", price: 8.50, minStock: 80, description: "First-line medication for the treatment of type 2 diabetes.", currentStock: 30 },
  { id: "med-5", name: "Vitamin C 1000mg", categoryId: "cat-5", categoryName: "Vitamins & Supplements", supplierId: "sup-4", supplierName: "Roche Diagnostics", price: 5.00, minStock: 150, description: "High potency Vitamin C supplement for immune system support.", currentStock: 400 }
];

const DEFAULT_BATCHES = [
  { id: "bat-1", medicineId: "med-1", medicineName: "Amoxicillin 500mg", batchNumber: "AMX-2025-01", manufacturingDate: "2025-01-10", expiryDate: "2027-01-10", quantity: 150, purchasePrice: 8.00, sellingPrice: 12.50 },
  { id: "bat-2", medicineId: "med-1", medicineName: "Amoxicillin 500mg", batchNumber: "AMX-2025-03", manufacturingDate: "2025-03-15", expiryDate: "2027-03-15", quantity: 100, purchasePrice: 8.00, sellingPrice: 12.50 },
  { id: "bat-3", medicineId: "med-2", medicineName: "Paracetamol 650mg", batchNumber: "PAR-2024-06", manufacturingDate: "2024-06-01", expiryDate: "2026-06-01", quantity: 50, purchasePrice: 2.50, sellingPrice: 4.20 }, // Expired!
  { id: "bat-4", medicineId: "med-3", medicineName: "Atorvastatin 20mg", batchNumber: "ATV-2025-02", manufacturingDate: "2025-02-12", expiryDate: "2027-02-12", quantity: 120, purchasePrice: 15.00, sellingPrice: 25.00 },
  { id: "bat-5", medicineId: "med-4", medicineName: "Metformin 500mg", batchNumber: "MET-2024-08", manufacturingDate: "2024-08-10", expiryDate: "2026-08-10", quantity: 30, purchasePrice: 5.00, sellingPrice: 8.50 }, // Expiring soon!
  { id: "bat-6", medicineId: "med-5", medicineName: "Vitamin C 1000mg", batchNumber: "VIT-2025-05", manufacturingDate: "2025-05-18", expiryDate: "2028-05-18", quantity: 400, purchasePrice: 3.00, sellingPrice: 5.00 }
];

const DEFAULT_PURCHASE_ORDERS = [
  {
    id: "po-1001",
    poNumber: "PO-2025-001",
    supplierId: "sup-1",
    supplierName: "Pfizer Pharmaceuticals",
    orderDate: "2025-05-10",
    deliveryDate: "2025-05-20",
    status: "DELIVERED",
    totalAmount: 2400.00,
    items: [
      { medicineId: "med-1", medicineName: "Amoxicillin 500mg", quantity: 200, unitPrice: 8.00, totalPrice: 1600.00 },
      { medicineId: "med-3", medicineName: "Atorvastatin 20mg", quantity: 80, unitPrice: 10.00, totalPrice: 800.00 }
    ]
  },
  {
    id: "po-1002",
    poNumber: "PO-2026-002",
    supplierId: "sup-2",
    supplierName: "Novartis AG",
    orderDate: "2026-06-15",
    deliveryDate: "",
    status: "APPROVED",
    totalAmount: 1250.00,
    items: [
      { medicineId: "med-2", medicineName: "Paracetamol 650mg", quantity: 500, unitPrice: 2.50, totalPrice: 1250.00 }
    ]
  },
  {
    id: "po-1003",
    poNumber: "PO-2026-003",
    supplierId: "sup-3",
    supplierName: "Bayer Healthcare",
    orderDate: "2026-07-01",
    deliveryDate: "",
    status: "PENDING",
    totalAmount: 750.00,
    items: [
      { medicineId: "med-4", medicineName: "Metformin 500mg", quantity: 150, unitPrice: 5.00, totalPrice: 750.00 }
    ]
  }
];

const DEFAULT_TRANSACTIONS = [
  { id: "tx-1", date: "2025-05-20", type: "STOCK_IN", medicineId: "med-1", medicineName: "Amoxicillin 500mg", quantity: 200, batchNumber: "AMX-2025-01", remarks: "Received from Purchase Order PO-2025-001" },
  { id: "tx-2", date: "2025-05-20", type: "STOCK_IN", medicineId: "med-3", medicineName: "Atorvastatin 20mg", quantity: 80, batchNumber: "ATV-2025-02", remarks: "Received from Purchase Order PO-2025-001" },
  { id: "tx-3", date: "2026-06-10", type: "STOCK_OUT", medicineId: "med-1", medicineName: "Amoxicillin 500mg", quantity: 50, batchNumber: "AMX-2025-01", remarks: "Dispensed to outpatient pharmacy" },
  { id: "tx-4", date: "2026-06-25", type: "STOCK_OUT", medicineId: "med-2", medicineName: "Paracetamol 650mg", quantity: 150, batchNumber: "PAR-2024-06", remarks: "Patient prescriptions batch release" },
  { id: "tx-5", date: "2026-07-02", type: "ADJUSTMENT", medicineId: "med-4", medicineName: "Metformin 500mg", quantity: -10, batchNumber: "MET-2024-08", remarks: "Damaged packaging write-off" },
  { id: "tx-6", date: "2026-07-03", type: "EXPIRED", medicineId: "med-2", medicineName: "Paracetamol 650mg", quantity: 50, batchNumber: "PAR-2024-06", remarks: "Expired batch quarantine" }
];

const DEFAULT_NOTIFICATIONS = [
  { id: "notif-1", title: "Low Stock Alert", message: "Paracetamol 650mg is running low. Current Stock: 50 (Minimum: 200)", type: "LOW_STOCK", date: "2026-07-02", read: false },
  { id: "notif-2", title: "Low Stock Alert", message: "Metformin 500mg is running low. Current Stock: 30 (Minimum: 80)", type: "LOW_STOCK", date: "2026-07-03", read: false },
  { id: "notif-3", title: "Batch Expiration Alert", message: "Batch PAR-2024-06 of Paracetamol 650mg expired on 2026-06-01", type: "EXPIRY", date: "2026-06-02", read: true },
  { id: "notif-4", title: "Batch Expiry Warning", message: "Batch MET-2024-08 of Metformin 500mg expires on 2026-08-10 (under 60 days)", type: "EXPIRY", date: "2026-07-01", read: false },
  { id: "notif-5", title: "Purchase Order Approved", message: "Purchase Order PO-2026-002 for Novartis AG has been APPROVED.", type: "PURCHASE_APPROVED", date: "2026-06-16", read: true }
];

// System Logs for Admin dashboard
const DEFAULT_SYSTEM_LOGS = [
  { id: "log-1", timestamp: "2026-07-03 05:10:22", user: "admin", action: "LOGIN", details: "User logged in successfully", ip: "192.168.1.100" },
  { id: "log-2", timestamp: "2026-07-03 04:32:15", user: "pharmacist", action: "STOCK_IN", details: "Logged stock adjustment for Metformin 500mg", ip: "192.168.1.105" },
  { id: "log-3", timestamp: "2026-07-03 01:15:00", user: "system", action: "BATCH_CHECK", details: "Automatic daily batch and expiry scanning completed", ip: "127.0.0.1" },
  { id: "log-4", timestamp: "2026-07-02 23:45:10", user: "admin", action: "USER_UPDATE", details: "Enabled account for Dr. Priya (Staff)", ip: "192.168.1.100" },
  { id: "log-5", timestamp: "2026-07-02 18:20:44", user: "pharmacist", action: "PO_CREATE", details: "Created Purchase Order PO-2026-003", ip: "192.168.1.105" }
];

// Helper to load or initialize from localStorage
const getCollection = (key, defaultValue) => {
  const data = localStorage.getItem(`medistock_${key}`);
  if (!data) {
    localStorage.setItem(`medistock_${key}`, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(data);
};

const saveCollection = (key, data) => {
  localStorage.setItem(`medistock_${key}`, JSON.stringify(data));
};

export const mockDb = {
  getUsers: () => getCollection("users", DEFAULT_USERS),
  saveUsers: (data) => saveCollection("users", data),

  getCategories: () => getCollection("categories", DEFAULT_CATEGORIES),
  saveCategories: (data) => saveCollection("categories", data),

  getSuppliers: () => getCollection("suppliers", DEFAULT_SUPPLIERS),
  saveSuppliers: (data) => saveCollection("suppliers", data),

  getMedicines: () => {
    // Recalculate medicine stock based on batches
    const medicines = getCollection("medicines", DEFAULT_MEDICINES);
    const batches = getCollection("batches", DEFAULT_BATCHES);
    
    const updated = medicines.map(med => {
      const medBatches = batches.filter(b => b.medicineId === med.id);
      const totalQty = medBatches.reduce((acc, curr) => acc + curr.quantity, 0);
      return { ...med, currentStock: totalQty };
    });
    
    saveCollection("medicines", updated);
    return updated;
  },
  saveMedicines: (data) => saveCollection("medicines", data),

  getBatches: () => getCollection("batches", DEFAULT_BATCHES),
  saveBatches: (data) => saveCollection("batches", data),

  getPurchaseOrders: () => getCollection("purchase_orders", DEFAULT_PURCHASE_ORDERS),
  savePurchaseOrders: (data) => saveCollection("purchase_orders", data),

  getTransactions: () => getCollection("transactions", DEFAULT_TRANSACTIONS),
  saveTransactions: (data) => saveCollection("transactions", data),

  getNotifications: () => getCollection("notifications", DEFAULT_NOTIFICATIONS),
  saveNotifications: (data) => saveCollection("notifications", data),

  getSystemLogs: () => getCollection("system_logs", DEFAULT_SYSTEM_LOGS),
  saveSystemLogs: (data) => saveCollection("system_logs", data),

  // Log an action helper
  addSystemLog: (user, action, details) => {
    const logs = getCollection("system_logs", DEFAULT_SYSTEM_LOGS);
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: user || "anonymous",
      action,
      details,
      ip: "192.168.1.110"
    };
    logs.unshift(newLog); // Add to beginning
    saveCollection("system_logs", logs);
  },

  // Helper to re-scan stock level and expiry alerts
  scanAndAlert: () => {
    const medicines = getCollection("medicines", DEFAULT_MEDICINES);
    const batches = getCollection("batches", DEFAULT_BATCHES);
    const notifications = getCollection("notifications", DEFAULT_NOTIFICATIONS);
    
    let addedAny = false;
    const now = new Date();
    
    // Check stock levels
    medicines.forEach(med => {
      const medBatches = batches.filter(b => b.medicineId === med.id);
      const totalStock = medBatches.reduce((sum, b) => sum + b.quantity, 0);
      
      if (totalStock <= med.minStock) {
        // Check if LOW_STOCK notification already exists for this medicine today
        const exists = notifications.some(n => n.type === "LOW_STOCK" && n.message.includes(med.name) && !n.read);
        if (!exists) {
          notifications.unshift({
            id: `notif-${Date.now()}-${med.id}`,
            title: "Low Stock Alert",
            message: `${med.name} is running low. Current Stock: ${totalStock} (Minimum: ${med.minStock})`,
            type: "LOW_STOCK",
            date: now.toISOString().split('T')[0],
            read: false
          });
          addedAny = true;
        }
      }
    });

    // Check expiry
    batches.forEach(bat => {
      const expDate = new Date(bat.expiryDate);
      const diffTime = expDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        // Expired
        const exists = notifications.some(n => n.type === "EXPIRY" && n.message.includes(bat.batchNumber) && n.message.includes("expired") && !n.read);
        if (!exists) {
          notifications.unshift({
            id: `notif-${Date.now()}-${bat.id}-exp`,
            title: "Batch Expired Alert",
            message: `Batch ${bat.batchNumber} of ${bat.medicineName} has expired on ${bat.expiryDate}`,
            type: "EXPIRY",
            date: now.toISOString().split('T')[0],
            read: false
          });
          addedAny = true;
        }
      } else if (diffDays <= 60) {
        // Expiring soon
        const exists = notifications.some(n => n.type === "EXPIRY" && n.message.includes(bat.batchNumber) && n.message.includes("expires") && !n.read);
        if (!exists) {
          notifications.unshift({
            id: `notif-${Date.now()}-${bat.id}-soon`,
            title: "Batch Expiry Warning",
            message: `Batch ${bat.batchNumber} of ${bat.medicineName} expires on ${bat.expiryDate} (${diffDays} days remaining)`,
            type: "EXPIRY",
            date: now.toISOString().split('T')[0],
            read: false
          });
          addedAny = true;
        }
      }
    });

    if (addedAny) {
      saveCollection("notifications", notifications);
    }
  }
};
