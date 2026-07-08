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
                       b.batch_number as "batchNumber", b.manufacturing_date as "manufacturingDate",
                       b.expiry_date as "expiryDate", b.quantity, b.purchase_price as "purchasePrice",
                       b.selling_price as "sellingPrice", b.created_at as "createdAt"
                from batches b
                left join medicines m on m.id = b.medicine_id
                order by b.expiry_date
                """));
    }

    @PostMapping("/api/batches")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBatch(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = queryOne("""
                insert into batches (medicine_id, batch_number, manufacturing_date, expiry_date, quantity, purchase_price, selling_price)
                values (cast(:medicineId as uuid), :batchNumber, cast(:manufacturingDate as date), cast(:expiryDate as date), :quantity, :purchasePrice, :sellingPrice)
                returning id, medicine_id as "medicineId", batch_number as "batchNumber",
                          manufacturing_date as "manufacturingDate", expiry_date as "expiryDate",
                          quantity, purchase_price as "purchasePrice", selling_price as "sellingPrice", created_at as "createdAt"
                """, params(body));
        refreshMedicineStock((UUID) created.get("medicineId"));
        return created("Batch created", created);
    }

    @PutMapping("/api/batches/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBatch(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        MapSqlParameterSource params = params(body).addValue("id", id);
        Map<String, Object> updated = queryOne("""
                update batches
                set medicine_id = cast(:medicineId as uuid), batch_number = :batchNumber, manufacturing_date = cast(:manufacturingDate as date),
                    expiry_date = cast(:expiryDate as date), quantity = :quantity, purchase_price = :purchasePrice, selling_price = :sellingPrice
                where id = :id
                returning id, medicine_id as "medicineId", batch_number as "batchNumber",
                          manufacturing_date as "manufacturingDate", expiry_date as "expiryDate",
                          quantity, purchase_price as "purchasePrice", selling_price as "sellingPrice", created_at as "createdAt"
                """, params);
        refreshMedicineStock((UUID) updated.get("medicineId"));
        return ok("Batch updated", updated);
    }

    @DeleteMapping("/api/batches/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBatch(@PathVariable UUID id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("select medicine_id from batches where id = ?", id);
        jdbcTemplate.update("delete from batches where id = ?", id);
        if (!rows.isEmpty()) {
            refreshMedicineStock((UUID) rows.get(0).get("medicine_id"));
        }
        return ResponseEntity.ok(ApiResponse.success("Batch deleted", null));
    }

    @GetMapping("/api/transactions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTransactions() {
        return ok("Transactions loaded", query("""
                select t.id, t.date, t.type, t.medicine_id as "medicineId", m.name as "medicineName",
                       t.quantity, t.batch_number as "batchNumber", t.remarks, t.created_at as "createdAt"
                from transactions t
                left join medicines m on m.id = t.medicine_id
                order by t.date desc, t.created_at desc
                """));
    }

    @PostMapping("/api/transactions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createTransaction(@RequestBody Map<String, Object> body) {
        Map<String, Object> created = queryOne("""
                insert into transactions (date, type, medicine_id, quantity, batch_number, remarks)
                values (coalesce(cast(:date as date), current_date), :type, cast(:medicineId as uuid), :quantity, :batchNumber, :remarks)
                returning id, date, type, medicine_id as "medicineId", quantity, batch_number as "batchNumber", remarks, created_at as "createdAt"
                """, params(body));
        refreshMedicineStock((UUID) created.get("medicineId"));
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

    private void refreshMedicineStock(UUID medicineId) {
        jdbcTemplate.update("""
                update medicines
                set current_stock = coalesce((select sum(quantity) from batches where medicine_id = ?), 0)
                where id = ?
                """, medicineId, medicineId);
    }
}
