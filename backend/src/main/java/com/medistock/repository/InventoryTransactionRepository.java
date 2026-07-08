package com.medistock.repository;

import com.medistock.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, UUID> {
    
    List<InventoryTransaction> findByMedicineId(UUID medicineId);

    @Query(value = """
           SELECT COALESCE(SUM(CASE
             WHEN transaction_type IN ('PURCHASE', 'RETURN') THEN quantity
             WHEN transaction_type = 'ADJUSTMENT' AND quantity > 0 THEN quantity
             ELSE -quantity
           END), 0)
           FROM inventory_transactions
           WHERE medicine_id = :medicineId
           """, nativeQuery = true)
    Integer calculateCurrentStockByMedicineId(@Param("medicineId") UUID medicineId);
}
