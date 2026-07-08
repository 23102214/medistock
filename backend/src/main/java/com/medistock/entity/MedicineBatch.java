package com.medistock.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "medicine_batches")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineBatch {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "batch_number", nullable = false, length = 50)
    private String batchNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "purchase_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "selling_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "received_date", nullable = false)
    @Builder.Default
    private LocalDate receivedDate = LocalDate.now();

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "OPTIMAL"; // OPTIMAL, LOW_STOCK, EXPIRED
}
