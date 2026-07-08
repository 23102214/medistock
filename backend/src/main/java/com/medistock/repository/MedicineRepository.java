package com.medistock.repository;

import com.medistock.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, UUID> {
    
    List<Medicine> findByNameContainingIgnoreCase(String name);
    
    @Query("SELECT m FROM Medicine m JOIN m.batches b WHERE b.expiryDate <= :date")
    List<Medicine> findExpiringMedicines(@Param("date") java.time.LocalDate date);
}
