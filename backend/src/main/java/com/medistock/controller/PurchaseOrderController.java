package com.medistock.controller;

import com.medistock.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PurchaseOrderController {

    private final JdbcTemplate jdbcTemplate;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createOrder(@RequestBody Map<String, Object> body) {
        String poNumber = "PO-" + System.currentTimeMillis();
        UUID supplierId = UUID.fromString(String.valueOf(body.get("supplierId")));
        String supplierName = String.valueOf(body.get("supplierName"));
        String medicineName = String.valueOf(body.get("medicineName"));
        Integer quantity = ((Number) body.get("quantity")).intValue();
        BigDecimal unitPrice = new BigDecimal(String.valueOf(body.get("unitPrice")));
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));

        Map<String, Object> created = jdbcTemplate.queryForMap("""
                insert into purchase_orders
                    (po_number, order_number, supplier_id, supplier_name, medicine_name, quantity, unit_price,
                     total_amount, status, created_by, order_date)
                values (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, current_date)
                returning id, po_number as "poNumber", order_number as "orderNumber",
                          supplier_id as "supplierId", supplier_name as "supplierName",
                          medicine_name as "medicineName", quantity, unit_price as "unitPrice",
                          total_amount as "totalAmount", status, created_by as "createdBy",
                          approved_by as "approvedBy", order_date as "orderDate", delivery_date as "deliveryDate"
                """, poNumber, poNumber, supplierId, supplierName, medicineName, quantity, unitPrice, totalAmount,
                String.valueOf(body.getOrDefault("createdBy", "system")));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Purchase order proposed successfully", withItems(created)));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approveOrder(@PathVariable UUID id) {
        return updateStatus(id, "APPROVED", "Procurement approved");
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rejectOrder(@PathVariable UUID id) {
        return updateStatus(id, "REJECTED", "Procurement order rejected");
    }

    @PutMapping("/{id}/receive")
    public ResponseEntity<ApiResponse<Map<String, Object>>> receiveOrder(@PathVariable UUID id) {
        Map<String, Object> updated = jdbcTemplate.queryForMap("""
                update purchase_orders
                set status = 'RECEIVED', delivery_date = current_date
                where id = ?
                returning id, po_number as "poNumber", order_number as "orderNumber",
                          supplier_id as "supplierId", supplier_name as "supplierName",
                          medicine_name as "medicineName", quantity, unit_price as "unitPrice",
                          total_amount as "totalAmount", status, created_by as "createdBy",
                          approved_by as "approvedBy", order_date as "orderDate", delivery_date as "deliveryDate"
                """, id);
        return ResponseEntity.ok(ApiResponse.success("Logistics verified", withItems(updated)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllOrders() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select id, po_number as "poNumber", order_number as "orderNumber",
                       supplier_id as "supplierId", supplier_name as "supplierName",
                       medicine_name as "medicineName", quantity, unit_price as "unitPrice",
                       total_amount as "totalAmount", status, created_by as "createdBy",
                       approved_by as "approvedBy", order_date as "orderDate", delivery_date as "deliveryDate"
                from purchase_orders
                order by order_date desc, created_at desc
                """);
        return ResponseEntity.ok(ApiResponse.success("Procurement list loaded", rows.stream().map(this::withItems).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOrderById(@PathVariable UUID id) {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                select id, po_number as "poNumber", order_number as "orderNumber",
                       supplier_id as "supplierId", supplier_name as "supplierName",
                       medicine_name as "medicineName", quantity, unit_price as "unitPrice",
                       total_amount as "totalAmount", status, created_by as "createdBy",
                       approved_by as "approvedBy", order_date as "orderDate", delivery_date as "deliveryDate"
                from purchase_orders
                where id = ?
                """, id);
        return ResponseEntity.ok(ApiResponse.success("Procurement order details loaded", withItems(row)));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> updateStatus(UUID id, String status, String message) {
        Map<String, Object> updated = jdbcTemplate.queryForMap("""
                update purchase_orders
                set status = ?
                where id = ?
                returning id, po_number as "poNumber", order_number as "orderNumber",
                          supplier_id as "supplierId", supplier_name as "supplierName",
                          medicine_name as "medicineName", quantity, unit_price as "unitPrice",
                          total_amount as "totalAmount", status, created_by as "createdBy",
                          approved_by as "approvedBy", order_date as "orderDate", delivery_date as "deliveryDate"
                """, status, id);
        return ResponseEntity.ok(ApiResponse.success(message, withItems(updated)));
    }

    private Map<String, Object> withItems(Map<String, Object> row) {
        Object quantity = row.get("quantity");
        Object unitPrice = row.get("unitPrice");
        BigDecimal totalPrice = new BigDecimal(String.valueOf(unitPrice)).multiply(new BigDecimal(String.valueOf(quantity)));
        row.put("items", List.of(Map.of(
                "medicineName", row.get("medicineName"),
                "quantity", quantity,
                "unitPrice", unitPrice,
                "totalPrice", totalPrice
        )));
        if ("RECEIVED".equals(row.get("status"))) {
            row.put("status", "DELIVERED");
        }
        return row;
    }
}
