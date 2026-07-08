package com.medistock.service.impl;

import com.medistock.constant.TransactionType;
import com.medistock.dto.PurchaseOrderDto;
import com.medistock.entity.InventoryTransaction;
import com.medistock.entity.Medicine;
import com.medistock.entity.MedicineBatch;
import com.medistock.entity.PurchaseOrder;
import com.medistock.exception.BadRequestException;
import com.medistock.exception.ResourceNotFoundException;
import com.medistock.repository.InventoryTransactionRepository;
import com.medistock.repository.MedicineRepository;
import com.medistock.repository.PurchaseOrderRepository;
import com.medistock.service.PurchaseOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository poRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository transactionRepository;

    @Override
    @Transactional
    public PurchaseOrderDto createPurchaseOrder(PurchaseOrderDto dto, String creatorUsername) {
        String orderNo = "PO-" + System.currentTimeMillis();
        
        PurchaseOrder po = PurchaseOrder.builder()
                .orderNumber(orderNo)
                .supplierName(dto.getSupplierName())
                .medicineName(dto.getMedicineName())
                .quantity(dto.getQuantity())
                .unitPrice(dto.getUnitPrice())
                .totalAmount(dto.getUnitPrice().multiply(java.math.BigDecimal.valueOf(dto.getQuantity())))
                .status("PENDING")
                .createdBy(creatorUsername)
                .orderDate(LocalDate.now())
                .build();

        PurchaseOrder saved = poRepository.save(po);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public PurchaseOrderDto approvePurchaseOrder(Long id, String approverUsername) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found"));

        if (!"PENDING".equals(po.getStatus())) {
            throw new BadRequestException("Purchase order is not in PENDING state");
        }

        po.setStatus("APPROVED");
        po.setApprovedBy(approverUsername);
        
        PurchaseOrder saved = poRepository.save(po);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public PurchaseOrderDto rejectPurchaseOrder(Long id, String approverUsername) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found"));

        if (!"PENDING".equals(po.getStatus())) {
            throw new BadRequestException("Purchase order is not in PENDING state");
        }

        po.setStatus("REJECTED");
        po.setApprovedBy(approverUsername);
        
        PurchaseOrder saved = poRepository.save(po);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public PurchaseOrderDto receivePurchaseOrder(Long id, String receiverUsername) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found"));

        if (!"APPROVED".equals(po.getStatus())) {
            throw new BadRequestException("Only APPROVED purchase orders can be received");
        }

        po.setStatus("RECEIVED");
        po.setDeliveryDate(LocalDate.now());

        // Dynamic creation of matching stock batches and transactions
        List<Medicine> medicines = medicineRepository.findByNameContainingIgnoreCase(po.getMedicineName());
        
        Medicine medicine;
        if (medicines.isEmpty()) {
            // Seed a new medicine node dynamically
            medicine = Medicine.builder()
                    .name(po.getMedicineName())
                    .genericName(po.getMedicineName())
                    .price(po.getUnitPrice().multiply(java.math.BigDecimal.valueOf(1.3))) // 30% markup
                    .minStockThreshold(10)
                    .status("ACTIVE")
                    .build();
            medicine = medicineRepository.save(medicine);
        } else {
            medicine = medicines.getFirst();
        }

        // Add a new batch
        MedicineBatch batch = MedicineBatch.builder()
                .batchNumber("BN-" + System.currentTimeMillis())
                .medicine(medicine)
                .quantity(po.getQuantity())
                .purchasePrice(po.getUnitPrice())
                .sellingPrice(po.getUnitPrice().multiply(java.math.BigDecimal.valueOf(1.3)))
                .expiryDate(LocalDate.now().plusYears(2))
                .receivedDate(LocalDate.now())
                .status("OPTIMAL")
                .build();
        medicine.getBatches().add(batch);
        medicineRepository.save(medicine);

        // Record purchase transaction
        InventoryTransaction transaction = InventoryTransaction.builder()
                .medicine(medicine)
                .batch(batch)
                .quantity(po.getQuantity())
                .transactionType(TransactionType.PURCHASE)
                .transactionDate(LocalDateTime.now())
                .performedBy(null)
                .remarks("Auto-received from Purchase Order " + po.getOrderNumber())
                .build();
        transactionRepository.save(transaction);

        PurchaseOrder saved = poRepository.save(po);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> getAllPurchaseOrders() {
        return poRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderDto getPurchaseOrderById(Long id) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found"));
        return mapToDto(po);
    }

    private PurchaseOrderDto mapToDto(PurchaseOrder po) {
        return PurchaseOrderDto.builder()
                .id(po.getId())
                .orderNumber(po.getOrderNumber())
                .supplierName(po.getSupplierName())
                .medicineName(po.getMedicineName())
                .quantity(po.getQuantity())
                .unitPrice(po.getUnitPrice())
                .totalAmount(po.getTotalAmount())
                .status(po.getStatus())
                .createdBy(po.getCreatedBy())
                .approvedBy(po.getApprovedBy())
                .orderDate(po.getOrderDate().toString())
                .deliveryDate(po.getDeliveryDate() != null ? po.getDeliveryDate().toString() : null)
                .build();
    }
}
