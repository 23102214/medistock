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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderDto {

    private Long id;

    private String orderNumber;

    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    @NotBlank(message = "Medicine name is required")
    private String medicineName;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than zero")
    private BigDecimal unitPrice;

    private BigDecimal totalAmount;
    private String status;
    private String createdBy;
    private String approvedBy;
    private String orderDate;
    private String deliveryDate;
}
