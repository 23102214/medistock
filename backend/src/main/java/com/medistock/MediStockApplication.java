package com.medistock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * MediStock - Medical Inventory Management Platform
 * 
 * Main Spring Boot Application entry point.
 * This class boots the integrated Tomcat server, initializes Spring contexts,
 * scans JPA entity tables, and enables daily clinical inventory scheduling.
 */
@SpringBootApplication
@EnableScheduling
public class MediStockApplication {

    public static void main(String[] args) {
        SpringApplication.run(MediStockApplication.class, args);
    }
}
