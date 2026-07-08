package com.medistock.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "medicines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Medicine {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Transient
    private String genericName;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "supplier_id")
    private UUID supplierId;

    @Transient
    private String category;

    @Transient
    private String supplierName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "min_stock", nullable = false)
    @Builder.Default
    private Integer minStockThreshold = 10;

    @Column(name = "current_stock", nullable = false)
    @Builder.Default
    private Integer currentStock = 0;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Transient
    @Builder.Default
    private String status = "ACTIVE";

    @OneToMany(mappedBy = "medicine", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MedicineBatch> batches = new ArrayList<>();
}
