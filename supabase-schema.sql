-- =====================================================================
-- MEDISTOCK — DEFINITIVE POSTGRESQL SCHEMA
-- Every column verified against Java entities + JDBC queries + Frontend
-- Safe to run in Supabase SQL Editor (drop + recreate approach)
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- STEP 1: DROP EXISTING TABLES (clean slate)
-- =====================================================================
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.medicine_batches        CASCADE;
DROP TABLE IF EXISTS public.purchase_orders         CASCADE;
DROP TABLE IF EXISTS public.medicines               CASCADE;
DROP TABLE IF EXISTS public.suppliers               CASCADE;
DROP TABLE IF EXISTS public.categories              CASCADE;
DROP TABLE IF EXISTS public.notifications           CASCADE;
DROP TABLE IF EXISTS public.system_logs             CASCADE;
DROP TABLE IF EXISTS public.users                   CASCADE;

-- =====================================================================
-- TABLE 1: users
-- Used by: AuthServiceImpl (JPA), OperationalDataController (JDBC)
-- JPA Entity columns: id(bigserial), username, password, full_name,
--   email, role, status, joined_date
-- =====================================================================
CREATE TABLE public.users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    role        VARCHAR(30)  NOT NULL DEFAULT 'STAFF'
                    CHECK (role IN ('ADMIN', 'PHARMACIST', 'STAFF')),
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE')),
    joined_date DATE         NOT NULL DEFAULT CURRENT_DATE
);

-- =====================================================================
-- TABLE 2: categories
-- Used by: OperationalDataController (JDBC)
-- Columns queried: id, name, description, created_at
-- =====================================================================
CREATE TABLE public.categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 3: suppliers
-- Used by: OperationalDataController (JDBC)
-- Columns queried: id, name, email, phone, address, gst_number, status
-- =====================================================================
CREATE TABLE public.suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) UNIQUE NOT NULL,
    contact_person  VARCHAR(100),
    email           VARCHAR(100),
    phone           VARCHAR(20),
    address         TEXT,
    gst_number      VARCHAR(20),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 4: medicines
-- Used by: OperationalDataController GET /api/medicines (JDBC + JOIN)
--   and MedicineController (JPA)
-- JPA Entity columns: id(uuid), name, category_id, supplier_id,
--   description, min_stock(=min_stock_threshold), price
-- JDBC query columns: id, name, generic_name, category_id, supplier_id,
--   description, min_stock_threshold, price, status
-- =====================================================================
CREATE TABLE public.medicines (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(150) NOT NULL,
    generic_name         VARCHAR(150) NOT NULL DEFAULT '',
    category_id          UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id          UUID REFERENCES public.suppliers(id)  ON DELETE SET NULL,
    description          TEXT,
    min_stock_threshold  INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_threshold >= 0),
    price                NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    status               VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                             CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 5: medicine_batches
-- Used by: OperationalDataController (JDBC)
--   MedicineBatch JPA entity maps: batch_number, medicine_id,
--   quantity, purchase_price, selling_price, expiry_date, received_date, status
-- JDBC queries columns: id, medicine_id, batch_number, expiry_date,
--   quantity, purchase_price, selling_price
-- =====================================================================
CREATE TABLE public.medicine_batches (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id    UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_number   VARCHAR(50) NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price  NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    expiry_date    DATE NOT NULL,
    received_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'OPTIMAL'
                       CHECK (status IN ('OPTIMAL', 'LOW_STOCK', 'EXPIRED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 6: purchase_orders
-- Used by: PurchaseOrderController (JDBC)
-- Columns inserted/queried: id(uuid), po_number, order_number,
--   supplier_id, supplier_name, medicine_name, quantity, unit_price,
--   total_amount, status, created_by, approved_by, order_date,
--   delivery_date, created_at
-- NOTE: PurchaseOrder JPA entity uses BIGSERIAL id but the controller
--   uses UUID. Using UUID here to match the controller SQL.
-- =====================================================================
CREATE TABLE public.purchase_orders (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number      VARCHAR(60) UNIQUE NOT NULL,
    order_number   VARCHAR(60) UNIQUE NOT NULL,
    supplier_id    UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    supplier_name  VARCHAR(150),
    medicine_name  VARCHAR(150),
    quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price     NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    total_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status         VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','APPROVED','REJECTED','RECEIVED','DELIVERED')),
    created_by     VARCHAR(100),
    approved_by    VARCHAR(100),
    order_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date  DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 7: inventory_transactions
-- Used by: OperationalDataController (JDBC)
--   InventoryTransaction JPA entity maps: medicine_id, batch_id,
--   quantity, transaction_type, transaction_date, performed_by, remarks
-- JDBC query: transaction_date as "date", transaction_type as "type",
--   medicine_id, batch_id, quantity, remarks
-- TransactionType enum: PURCHASE, SALE, RETURN, EXPIRED, DAMAGED, ADJUSTMENT
-- =====================================================================
CREATE TABLE public.inventory_transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id      UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_id         UUID REFERENCES public.medicine_batches(id) ON DELETE SET NULL,
    quantity         INTEGER NOT NULL,
    transaction_type VARCHAR(30) NOT NULL
                         CHECK (transaction_type IN ('PURCHASE','SALE','RETURN','EXPIRED','DAMAGED','ADJUSTMENT')),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by     BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    remarks          VARCHAR(255)
);

-- =====================================================================
-- TABLE 8: notifications
-- Used by: OperationalDataController (JDBC)
-- JDBC query: id, title, message, type, date, read, created_at
-- NOTE: backend queries a "date" column specifically — must exist!
-- =====================================================================
CREATE TABLE public.notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title      VARCHAR(150) NOT NULL,
    message    TEXT NOT NULL,
    type       VARCHAR(30) NOT NULL DEFAULT 'SYSTEM'
                   CHECK (type IN ('LOW_STOCK','EXPIRY','PURCHASE_APPROVED','PURCHASE_RECEIVED','SYSTEM')),
    date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLE 9: system_logs
-- Used by: OperationalDataController GET /api/system-logs (JDBC)
-- JDBC query: id, timestamp, user_username as "user", action,
--   details, ip, created_at
-- =====================================================================
CREATE TABLE public.system_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_username VARCHAR(100),
    action        VARCHAR(100) NOT NULL,
    details       TEXT,
    ip            VARCHAR(50),
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- RLS: DISABLED on all tables
-- Reason: Spring Boot connects via JDBC as the postgres superuser.
-- PostgreSQL superusers bypass RLS automatically. All security is
-- enforced at the API layer via Spring Security + JWT roles.
-- =====================================================================
ALTER TABLE public.users                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_batches       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs            DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- GRANT full access to the postgres role (used by JDBC connection)
-- =====================================================================
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- =====================================================================
-- SEED DATA: Categories
-- =====================================================================
INSERT INTO public.categories (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Antibiotics',          'Bacterial infection medications'),
  ('22222222-2222-2222-2222-222222222222', 'Analgesics',           'Pain management and fever reduction'),
  ('33333333-3333-3333-3333-333333333333', 'Cardiovascular',       'Blood pressure and cardiac regulators'),
  ('44444444-4444-4444-4444-444444444444', 'Vitamins & Supplements','Nutritional supplements and vitamins'),
  ('55555555-5555-5555-5555-555555555555', 'Antidiabetics',        'Blood sugar regulation medications')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- SEED DATA: Suppliers
-- =====================================================================
INSERT INTO public.suppliers (id, name, contact_person, email, phone, address, gst_number, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pfizer Logistics',    'Dr. Sarah Connor', 'connor@pfizer.com',    '+1-555-0199',      '235 East 42nd St, New York, NY',          '27AAPFU0939F1ZV', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Novartis Pharma',     'Michael Vance',    'vance@novartis.com',   '+41-61-324-1111',  'Lichtstrasse 35, Basel, Switzerland',     '07AABCN3423M1ZK', 'ACTIVE'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sun Pharmaceutical',  'Rajesh Mehta',     'rmehta@sunpharma.com', '+91-22-4324-4324', 'Sun House, Vile Parle, Mumbai',           '24AADCS9324N1ZL', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- SEED DATA: Medicines
-- =====================================================================
INSERT INTO public.medicines (id, name, generic_name, category_id, supplier_id, description, min_stock_threshold, price, status) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Amoxicillin 500mg',  'Amoxicillin Trihydrate',    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Broad-spectrum penicillin antibiotic for bacterial respiratory infections.', 50,  12.50, 'ACTIVE'),
  ('d2222222-2222-2222-2222-222222222222', 'Paracetamol 650mg',  'Acetaminophen',             '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Highly effective antipyretic and analgesic tablet compound.',               100,  4.25, 'ACTIVE'),
  ('d3333333-3333-3333-3333-333333333333', 'Metformin 500mg',    'Metformin Hydrochloride',   '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'First-line oral medication for type 2 diabetes management.',                75,   8.00, 'ACTIVE'),
  ('d4444444-4444-4444-4444-444444444444', 'Atorvastatin 10mg',  'Atorvastatin Calcium',      '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HMG-CoA reductase inhibitor for cholesterol management.',                  30,  18.75, 'ACTIVE'),
  ('d5555555-5555-5555-5555-555555555555', 'Vitamin D3 1000IU',  'Cholecalciferol',           '44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Essential fat-soluble vitamin for bone and immune health.',                 60,   6.00, 'ACTIVE')
ON CONFLICT DO NOTHING;