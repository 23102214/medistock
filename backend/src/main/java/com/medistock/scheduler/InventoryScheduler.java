package com.medistock.scheduler;

import com.medistock.entity.Medicine;
import com.medistock.repository.InventoryTransactionRepository;
import com.medistock.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryScheduler {

    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository transactionRepository;

    /**
     * Runs every day at 00:00:00 to verify expiry dates in clinical batches
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional(readOnly = true)
    public void trackMedicineBatchesExpiry() {
        log.info("System Scheduler: Commencing clinical medicine expiry sweep...");
        
        LocalDate targetExpiryLimit = LocalDate.now().plusDays(30);
        List<Medicine> expiringMedicines = medicineRepository.findExpiringMedicines(targetExpiryLimit);

        for (Medicine medicine : expiringMedicines) {
            log.warn("ALERT: Clinical Medicine {} contains batches expiring within 30 days! Generating Notification.", medicine.getName());
            // In full integration, this would trigger an insertion into the Notifications table.
        }
    }

    /**
     * Runs every day at 02:00:00 to inspect stock levels against critical minimum thresholds
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional(readOnly = true)
    public void auditLowStockThresholds() {
        log.info("System Scheduler: Initiating low stock safety margin audit...");

        List<Medicine> activeCatalogue = medicineRepository.findAll();
        
        for (Medicine medicine : activeCatalogue) {
            int currentStock = transactionRepository.calculateCurrentStockByMedicineId(medicine.getId());
            if (currentStock < medicine.getMinStockThreshold()) {
                log.error("CRITICAL SAFETY STOCK DEPLETED: {} current balance is {} (Safety threshold: {})", 
                        medicine.getName(), currentStock, medicine.getMinStockThreshold());
                // In full integration, triggers a LOW_STOCK type Notification inside DB.
            }
        }
    }
}
