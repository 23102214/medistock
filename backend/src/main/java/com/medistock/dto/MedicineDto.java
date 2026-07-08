package com.medistock.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineDto {

    private UUID id;

    @NotBlank(message = "Medicine name is required")
    private String name;

    @NotBlank(message = "Generic name is required")
    private String genericName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    private String description;

    @NotNull(message = "Minimum stock threshold is required")
    @Positive(message = "Threshold must be positive")
    private Integer minStockThreshold;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than zero")
    private BigDecimal price;

    private String status;
}
