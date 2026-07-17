package com.medistock.controller;

import com.medistock.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OperationalDataController {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbcTemplate;

    // Override: list all medicines with live stock calculation from batches + joined category/supplier names
    @GetMapping("/api/medicines")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMedicines() {
        return ok("Medicines loaded", query("""
                select m.id, m.name, m.generic_name as "genericName",
                       m.category_id as "categoryId", c.name as "categoryName",
                       m.supplier_id as "supplierId", s.name as "supplierName",
                       m.description, m.min_stock_threshold as "minStockThreshold",
                       m.min_stock_threshold as "minStock",
                       coalesce((select sum(b.quantity) from medicine_batches b where b.medicine_id = m.id), 0) as "currentStock",
                       m.price, m.status, m.created_at as "createdAt"
                from medicines m
                left join categories c on c.id = m.category_id
                left join suppliers s on s.id = m.supplier_id
                order by m.name
                """));
    }

    @GetMapping("/api/categories")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategories() {
        return ok("Categories loaded", query("""
                select id, name, description, created_at as "createdAt"
                from categories
                order by name
                """));
    }

    @PostMapping("/api/categories")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createCategory(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = queryOne("""
                insert into categories (name, description)
                values (:name, :description)
                returning id, name, description, created_at as "createdAt"
                """, params(body));
        return created("Category created", created);
    }

    @PutMapping("/api/categories/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateCategory(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        MapSqlParameterSource params = params(body).addValue("id", id);
        Map<String, Object> updated = queryOne("""
                update categories
                set name = :name, description = :description
                where id = :id
                returning id, name, description, created_at as "createdAt"
                """, params);
        return ok("Category updated", updated);
    }

    @DeleteMapping("/api/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable UUID id) {
        jdbcTemplate.update("delete from categories where id = ?", id);
        return ResponseEntity.ok(ApiResponse.success("Category deleted", null));
    }

    @GetMapping("/api/suppliers")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSuppliers() {
        return ok("Suppliers loaded", query("""
                select id, name, email, phone, address, gst_number as "gstNumber", status, created_at as "createdAt"
                from suppliers
                order by name
                """));
    }

    @PostMapping("/api/suppliers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSupplier(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = queryOne("""
                insert into suppliers (name, email, phone, address, gst_number, status)
                values (:name, :email, :phone, :address, :gstNumber, coalesce(:status, 'ACTIVE'))
                returning id, name, email, phone, address, gst_number as "gstNumber", status, created_at as "createdAt"
                """, params(body));
        return created("Supplier created", created);
    }

    @PutMapping("/api/suppliers/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSupplier(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        MapSqlParameterSource params = params(body).addValue("id", id);
        Map<String, Object> updated = queryOne("""
                update suppliers
                set name = :name, email = :email, phone = :phone, address = :address,
                    gst_number = :gstNumber, status = coalesce(:status, status)
                where id = :id
                returning id, name, email, phone, address, gst_number as "gstNumber", status, created_at as "createdAt"
                """, params);
        return ok("Supplier updated", updated);
    }

    @DeleteMapping("/api/suppliers/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable UUID id) {
        jdbcTemplate.update("delete from suppliers where id = ?", id);
        return ResponseEntity.ok(ApiResponse.success("Supplier deleted", null));
    }

    @GetMapping("/api/batches")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBatches() {
        return ok("Batches loaded", query("""
                select b.id, b.medicine_id as "medicineId", m.name as "medicineName",
                       b.batch_number as "batchNumber",
                       b.expiry_date as "expiryDate", b.quantity, b.purchase_price as "purchasePrice",
                       b.selling_price as "sellingPrice", b.created_at as "createdAt"
                from medicine_batches b
                left join medicines m on m.id = b.medicine_id
                order by b.expiry_date
                """));
    }

    @PostMapping("/api/batches")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBatch(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = queryOne("""
                insert into medicine_batches (medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price)
                values (cast(:medicineId as uuid), :batchNumber, cast(:expiryDate as date), :quantity, :purchasePrice, :sellingPrice)
                returning id, medicine_id as "medicineId", batch_number as "batchNumber",
                          expiry_date as "expiryDate",
                          quantity, purchase_price as "purchasePrice", selling_price as "sellingPrice", created_at as "createdAt"
                """, params(body));
        refreshMedicineStock(created.get("medicineId"));
        return created("Batch created", created);
    }

    @PutMapping("/api/batches/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBatch(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        MapSqlParameterSource params = params(body).addValue("id", id);
        Map<String, Object> updated = queryOne("""
                update medicine_batches
                set medicine_id = cast(:medicineId as uuid), batch_number = :batchNumber,
                    expiry_date = cast(:expiryDate as date), quantity = :quantity, purchase_price = :purchasePrice, selling_price = :sellingPrice
                where id = :id
                returning id, medicine_id as "medicineId", batch_number as "batchNumber",
                          expiry_date as "expiryDate",
                          quantity, purchase_price as "purchasePrice", selling_price as "sellingPrice", created_at as "createdAt"
                """, params);
        refreshMedicineStock(updated.get("medicineId"));
        return ok("Batch updated", updated);
    }

    @DeleteMapping("/api/batches/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBatch(@PathVariable UUID id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("select medicine_id from medicine_batches where id = ?", id);
        jdbcTemplate.update("delete from medicine_batches where id = ?", id);
        if (!rows.isEmpty()) {
            refreshMedicineStock(rows.get(0).get("medicine_id"));
        }
        return ResponseEntity.ok(ApiResponse.success("Batch deleted", null));
    }

    @GetMapping("/api/transactions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTransactions() {
        return ok("Transactions loaded", query("""
                select t.id, t.transaction_date as "date", t.transaction_type as "type", t.medicine_id as "medicineId", m.name as "medicineName",
                       t.quantity, b.batch_number as "batchNumber", t.remarks, t.transaction_date as "createdAt"
                from inventory_transactions t
                left join medicines m on m.id = t.medicine_id
                left join medicine_batches b on b.id = t.batch_id
                order by t.transaction_date desc
                """));
    }

    @PostMapping("/api/transactions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createTransaction(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = queryOne("""
                insert into inventory_transactions (transaction_date, transaction_type, medicine_id, batch_id, quantity, remarks)
                values (
                    coalesce(cast(:date as timestamp), current_timestamp),
                    :type,
                    cast(:medicineId as uuid),
                    (select id from medicine_batches where batch_number = :batchNumber and medicine_id = cast(:medicineId as uuid) limit 1),
                    :quantity,
                    :remarks
                )
                returning id, transaction_date as "date", transaction_type as "type", medicine_id as "medicineId", quantity, remarks
                """, params(body));
        refreshMedicineStock(created.get("medicineId"));
        return created("Transaction recorded", created);
    }

    @GetMapping("/api/notifications")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getNotifications() {
        return ok("Notifications loaded", query("""
                select id, title, message, type, date, read, created_at as "createdAt"
                from notifications
                order by date desc, created_at desc
                """));
    }

    @PutMapping("/api/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationRead(@PathVariable UUID id) {
        jdbcTemplate.update("update notifications set read = true where id = ?", id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked read", null));
    }

    @PutMapping("/api/notifications/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllNotificationsRead() {
        jdbcTemplate.update("update notifications set read = true");
        return ResponseEntity.ok(ApiResponse.success("Notifications marked read", null));
    }

    @GetMapping("/api/users")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUsers() {
        return ok("Users loaded", query("""
                select id, username, email, full_name as "fullName", role, status, joined_date as "joinedDate"
                from users
                order by joined_date desc, username
                """));
    }

    @PutMapping("/api/users/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        MapSqlParameterSource params = params(body).addValue("id", id);
        Map<String, Object> updated = queryOne("""
                update users
                set full_name = coalesce(:fullName, full_name),
                    email = coalesce(:email, email),
                    role = coalesce(:role, role),
                    status = coalesce(:status, status)
                where id = :id
                returning id, username, email, full_name as "fullName", role, status, joined_date as "joinedDate"
                """, params);
        return ok("User updated", updated);
    }

    @GetMapping("/api/system-logs")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSystemLogs() {
        return ok("System logs loaded", query("""
                select id, timestamp, user_username as "user", action, details, ip, created_at as "createdAt"
                from system_logs
                order by timestamp desc
                limit 100
                """));
    }

    private ResponseEntity<ApiResponse<List<Map<String, Object>>>> ok(String message, List<Map<String, Object>> data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> ok(String message, Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> created(String message, Map<String, Object> data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(message, data));
    }

    private List<Map<String, Object>> query(String sql) {
        return jdbcTemplate.queryForList(sql);
    }

    private Map<String, Object> queryOne(String sql, MapSqlParameterSource params) {
        return namedJdbcTemplate.queryForMap(sql, params);
    }

    private MapSqlParameterSource params(Map<String, Object> body) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        List.of("name", "description", "email", "phone", "address", "gstNumber", "status",
                "medicineId", "batchNumber", "manufacturingDate", "expiryDate", "quantity",
                "purchasePrice", "sellingPrice", "date", "type", "remarks", "fullName",
                "role").forEach(key -> params.addValue(key, null));
        body.forEach(params::addValue);
        return params;
    }

    // Stock is calculated live from medicine_batches via subquery in GET /api/medicines.
    // This method is kept as a no-op to avoid breaking callers; no current_stock column exists in DB.
    private void refreshMedicineStock(Object medicineIdObj) {
        // no-op: stock is calculated dynamically
    }
}

