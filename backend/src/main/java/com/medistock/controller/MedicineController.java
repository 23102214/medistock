package com.medistock.controller;

import com.medistock.dto.MedicineDto;
import com.medistock.response.ApiResponse;
import com.medistock.service.MedicineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
@Tag(name = "Medicine Catalogue", description = "CRUD and physical stock transaction histories")
@CrossOrigin(origins = "*")
public class MedicineController {

    private final MedicineService medicineService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    @Operation(summary = "Create medicine specification", description = "Register a new clinical medicine under a categories listing")
    public ResponseEntity<ApiResponse<MedicineDto>> createMedicine(@Valid @RequestBody MedicineDto dto) {
        MedicineDto created = medicineService.createMedicine(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Medicine added successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    @Operation(summary = "Update medicine details")
    public ResponseEntity<ApiResponse<MedicineDto>> updateMedicine(@PathVariable UUID id, @Valid @RequestBody MedicineDto dto) {
        MedicineDto updated = medicineService.updateMedicine(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Medicine parameters updated", updated));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Fetch medicine details")
    public ResponseEntity<ApiResponse<MedicineDto>> getMedicine(@PathVariable UUID id) {
        MedicineDto medicine = medicineService.getMedicineById(id);
        return ResponseEntity.ok(ApiResponse.success("Medicine loaded", medicine));
    }

    // @GetMapping
    // @Operation(summary = "List all catalogue items")
    // public ResponseEntity<ApiResponse<List<MedicineDto>>> getAllMedicines() {
    //     List<MedicineDto> list = medicineService.getAllMedicines();
    //     return ResponseEntity.ok(ApiResponse.success("Catalogue loaded", list));
    // }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove catalog entries")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(@PathVariable UUID id) {
        medicineService.deleteMedicine(id);
        return ResponseEntity.ok(ApiResponse.success("Catalogue entry removed", null));
    }

    @GetMapping("/{id}/stock")
    @Operation(summary = "Dynamically calculate real stock level")
    public ResponseEntity<ApiResponse<Integer>> getStockLevel(@PathVariable UUID id) {
        int stock = medicineService.getStockLevel(id);
        return ResponseEntity.ok(ApiResponse.success("Current physical balance calculated", stock));
    }

    @PostMapping("/{id}/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    @Operation(summary = "Record physical inventory action")
    public ResponseEntity<ApiResponse<Void>> adjustStock(
            @PathVariable UUID id,
            @RequestParam int quantity,
            @RequestParam String type,
            @RequestParam(required = false, defaultValue = "") String remarks) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        medicineService.adjustStock(id, quantity, type, username, remarks);
        return ResponseEntity.ok(ApiResponse.success("Stock adjustment history recorded", null));
    }
}
