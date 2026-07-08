# MediStock Spring Boot Backend

This directory contains the production-ready Spring Boot 3.x backend for the MediStock Medical Inventory Management Platform, developed using Java 21, Spring Boot, PostgreSQL, Spring Data JPA, and Spring Security with JWT.

## Technologies
- Java 21
- Spring Boot 3.x
- PostgreSQL
- Spring Data JPA & Hibernate
- Spring Security & JWT Authentication
- Jakarta Validation
- Lombok
- MapStruct / Manual Mappers
- Maven

## Project Structure
`backend/src/main/java/com/medistock/`
- `config/`: App and security configurations
- `controller/`: REST APIs
- `dto/`: Request/Response data transfer objects
- `entity/`: JPA entities representing database tables
- `exception/`: Global and custom exception handlers
- `mapper/`: Entity-DTO mappers
- `repository/`: Spring Data JPA repositories
- `security/`: JWT and authorization logic
- `service/`: Service interfaces
- `service/impl/`: Service implementations
- `util/`: Helper classes
- `scheduler/`: Automated tasks (Expiry, Low Stock)
- `response/`: Standardized REST responses
- `constant/`: Constant values and enums
