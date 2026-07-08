package com.medistock.service;

import com.medistock.dto.MedicineDto;
import java.util.List;
import java.util.UUID;

public interface MedicineService {
    MedicineDto createMedicine(MedicineDto medicineDto);
    MedicineDto updateMedicine(UUID id, MedicineDto medicineDto);
    MedicineDto getMedicineById(UUID id);
    List<MedicineDto> getAllMedicines();
    void deleteMedicine(UUID id);
    int getStockLevel(UUID id);
    void adjustStock(UUID id, int quantity, String type, String username, String remarks);
}
