package com.medistock.service.impl;

import com.medistock.constant.TransactionType;
import com.medistock.dto.MedicineDto;
import com.medistock.entity.InventoryTransaction;
import com.medistock.entity.Medicine;
import com.medistock.exception.ResourceNotFoundException;
import com.medistock.repository.InventoryTransactionRepository;
import com.medistock.repository.MedicineRepository;
import com.medistock.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicineServiceImpl implements MedicineService {

    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository transactionRepository;

    @Override
    @Transactional
    public MedicineDto createMedicine(MedicineDto dto) {
        Medicine medicine = Medicine.builder()
                .name(dto.getName())
                .genericName(dto.getGenericName())
                .category(dto.getCategory())
                .categoryId(dto.getCategoryId())
                .supplierName(dto.getSupplierName())
                .supplierId(dto.getSupplierId())
                .description(dto.getDescription())
                .minStockThreshold(dto.getMinStockThreshold())
                .price(dto.getPrice())
                .status("ACTIVE")
                .build();

        Medicine saved = medicineRepository.save(medicine);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public MedicineDto updateMedicine(UUID id, MedicineDto dto) {
        Medicine existing = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine stock entity not found"));

        existing.setName(dto.getName());
        existing.setGenericName(dto.getGenericName());
        existing.setCategory(dto.getCategory());
        existing.setCategoryId(dto.getCategoryId());
        existing.setSupplierName(dto.getSupplierName());
        existing.setSupplierId(dto.getSupplierId());
        existing.setDescription(dto.getDescription());
        existing.setMinStockThreshold(dto.getMinStockThreshold());
        existing.setPrice(dto.getPrice());

        Medicine saved = medicineRepository.save(existing);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineDto getMedicineById(UUID id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found"));
        return mapToDto(medicine);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineDto> getAllMedicines() {
        return medicineRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteMedicine(UUID id) {
        if (!medicineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Medicine not found");
        }
        medicineRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public int getStockLevel(UUID id) {
        Integer stock = transactionRepository.calculateCurrentStockByMedicineId(id);
        return stock != null ? stock : 0;
    }

    @Override
    @Transactional
    public void adjustStock(UUID id, int quantity, String type, String username, String remarks) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found"));

        TransactionType tType = TransactionType.valueOf(type.toUpperCase());

        InventoryTransaction transaction = InventoryTransaction.builder()
                .medicine(medicine)
                .quantity(quantity)
                .transactionType(tType)
                .transactionDate(LocalDateTime.now())
                .performedBy(null)
                .remarks(remarks)
                .build();

        transactionRepository.save(transaction);
    }

    private MedicineDto mapToDto(Medicine medicine) {
        return MedicineDto.builder()
                .id(medicine.getId())
                .name(medicine.getName())
                .genericName(medicine.getGenericName())
                .category(medicine.getCategory())
                .categoryId(medicine.getCategoryId())
                .supplierName(medicine.getSupplierName())
                .supplierId(medicine.getSupplierId())
                .description(medicine.getDescription())
                .minStockThreshold(medicine.getMinStockThreshold())
                .price(medicine.getPrice())
                .status(medicine.getStatus())
                .build();
    }
}
