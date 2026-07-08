-- =====================================================================
-- MEDISTOCK: MEDICAL INVENTORY MANAGEMENT PLATFORM
-- PRODUCTION-READY POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- Optimized for Supabase SQL Editor
-- =====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing assets (optional, commented for safety)
-- DROP TABLE IF EXISTS public.audit_logs CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
-- DROP TABLE IF EXISTS public.medicine_batches CASCADE;
-- DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
-- DROP TABLE IF EXISTS public.purchase_orders CASCADE;
-- DROP TABLE IF EXISTS public.medicines CASCADE;
-- DROP TABLE IF EXISTS public.suppliers CASCADE;
-- DROP TABLE IF EXISTS public.categories CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP FUNCTION IF EXISTS public.get_user_role CASCADE;

-- =====================================================================
-- 1. PROFILES TABLE (Tied to Supabase Auth Users)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'PHARMACIST', 'STAFF')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    joined_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. CATEGORIES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. SUPPLIERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. MEDICINES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    description TEXT,
    min_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_threshold >= 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5. MEDICINE BATCHES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.medicine_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(50) NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    expiry_date DATE NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPTIMAL' CHECK (status IN ('OPTIMAL', 'LOW_STOCK', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_prices CHECK (selling_price >= purchase_price)
);

ALTER TABLE public.medicine_batches ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. PURCHASE ORDERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RECEIVED')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 7. PURCHASE ORDER ITEMS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 8. INVENTORY TRANSACTIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES public.medicine_batches(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'SALE', 'RETURN', 'EXPIRED', 'DAMAGED', 'ADJUSTMENT')),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 9. NOTIFICATIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('LOW_STOCK', 'EXPIRY', 'PURCHASE_APPROVED', 'PURCHASE_RECEIVED', 'SYSTEM')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 10. AUDIT LOGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- SECURE ROLE INFERENCE FUNCTIONS (SECURITY DEFINER)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'STAFF');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_user_role() = 'ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_pharmacist()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_user_role() IN ('ADMIN', 'PHARMACIST');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- ---------------------------------------------------------------------
-- PROFILES POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;
CREATE POLICY "Users can update their own profile details"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND (role = public.get_user_role() OR public.is_admin())); -- Prevent changing own role unless admin

DROP POLICY IF EXISTS "Admins have full write permissions on profiles" ON public.profiles;
CREATE POLICY "Admins have full write permissions on profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------
-- CATEGORIES POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can read categories" ON public.categories;
CREATE POLICY "All authenticated users can read categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Only Pharmacists and Admins can write categories" ON public.categories;
CREATE POLICY "Only Pharmacists and Admins can write categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_pharmacist());

-- ---------------------------------------------------------------------
-- SUPPLIERS POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can read suppliers" ON public.suppliers;
CREATE POLICY "All authenticated users can read suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Only Pharmacists and Admins can write suppliers" ON public.suppliers;
CREATE POLICY "Only Pharmacists and Admins can write suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (public.is_pharmacist());

-- ---------------------------------------------------------------------
-- MEDICINES POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can read medicines" ON public.medicines;
CREATE POLICY "All authenticated users can read medicines"
ON public.medicines FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Only Pharmacists and Admins can write medicines" ON public.medicines;
CREATE POLICY "Only Pharmacists and Admins can write medicines"
ON public.medicines FOR ALL
TO authenticated
USING (public.is_pharmacist());

-- ---------------------------------------------------------------------
-- MEDICINE BATCHES POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can read batches" ON public.medicine_batches;
CREATE POLICY "All authenticated users can read batches"
ON public.medicine_batches FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Only Pharmacists and Admins can write batches" ON public.medicine_batches;
CREATE POLICY "Only Pharmacists and Admins can write batches"
ON public.medicine_batches FOR ALL
TO authenticated
USING (public.is_pharmacist());

-- ---------------------------------------------------------------------
-- PURCHASE ORDERS POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can view purchase orders" ON public.purchase_orders;
CREATE POLICY "All authenticated users can view purchase orders"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Pharmacists and Admins can create purchase orders" ON public.purchase_orders;
CREATE POLICY "Pharmacists and Admins can create purchase orders"
ON public.purchase_orders FOR INSERT
TO authenticated
WITH CHECK (public.is_pharmacist());

DROP POLICY IF EXISTS "Pharmacists and Admins can update purchase orders" ON public.purchase_orders;
CREATE POLICY "Pharmacists and Admins can update purchase orders"
ON public.purchase_orders FOR UPDATE
TO authenticated
USING (public.is_pharmacist());

DROP POLICY IF EXISTS "Only Admins can delete purchase orders" ON public.purchase_orders;
CREATE POLICY "Only Admins can delete purchase orders"
ON public.purchase_orders FOR DELETE
TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------
-- PURCHASE ORDER ITEMS POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can view PO items" ON public.purchase_order_items;
CREATE POLICY "All authenticated users can view PO items"
ON public.purchase_order_items FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Pharmacists and Admins can manage PO items" ON public.purchase_order_items;
CREATE POLICY "Pharmacists and Admins can manage PO items"
ON public.purchase_order_items FOR ALL
TO authenticated
USING (public.is_pharmacist());

-- ---------------------------------------------------------------------
-- INVENTORY TRANSACTIONS POLICIES (Append-only Ledger Security Pattern)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can read inventory transactions" ON public.inventory_transactions;
CREATE POLICY "All authenticated users can read inventory transactions"
ON public.inventory_transactions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Pharmacists and Admins can log transactions" ON public.inventory_transactions;
CREATE POLICY "Pharmacists and Admins can log transactions"
ON public.inventory_transactions FOR INSERT
TO authenticated
WITH CHECK (public.is_pharmacist());

-- Notice: NO UPDATE OR DELETE policies are defined for inventory_transactions.
-- This ensures strict ledger consistency. All changes must be made via new transactions.

-- ---------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can view notifications" ON public.notifications;
CREATE POLICY "All authenticated users can view notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "All authenticated users can mark notifications as read" ON public.notifications;
CREATE POLICY "All authenticated users can mark notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (read IS DISTINCT FROM NULL);

DROP POLICY IF EXISTS "Admins and system processes can write notifications" ON public.notifications;
CREATE POLICY "Admins and system processes can write notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------
-- AUDIT LOGS POLICIES (Immutable Audit Trail Pattern)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Only Admins can view system audit logs" ON public.audit_logs;
CREATE POLICY "Only Admins can view system audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "All users can write to audit logs" ON public.audit_logs;
CREATE POLICY "All users can write to audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Notice: NO UPDATE OR DELETE policies exist for audit_logs.
-- Once logged, entries are strictly immutable.


-- =====================================================================
-- AUTH SYNC AUTOMATION: AUTH TRIGGER FOR USER REGISTRATION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role VARCHAR := 'STAFF';
    username_val VARCHAR;
    full_name_val VARCHAR;
BEGIN
    -- Extract values from user metadata if supplied, otherwise fallback
    username_val := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', username_val);
    
    -- If registering first user, promote automatically to ADMIN for configuration
    IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
        default_role := 'ADMIN';
    ELSE
        default_role := COALESCE(new.raw_user_meta_data->>'role', 'STAFF');
    END IF;

    INSERT INTO public.profiles (id, username, full_name, email, role, status)
    VALUES (
        new.id,
        username_val,
        full_name_val,
        new.email,
        default_role,
        'ACTIVE'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- DUMMY SEED DATA FOR CLINICAL SYSTEM INITIATION (OPTIONAL)
-- =====================================================================

-- Note: In production Supabase, you would run these queries in order.
-- To test in local/dev SQL editor, you can uncomment these lines.
/*
-- 1. Create categories
INSERT INTO public.categories (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Antibiotics', 'Bacterial infection medications'),
('22222222-2222-2222-2222-222222222222', 'Analgesics', 'Pain management and fever reduction formulations'),
('33333333-3333-3333-3333-333333333333', 'Cardiovascular', 'Blood pressure and cardiac performance regulators');

-- 2. Create suppliers
INSERT INTO public.suppliers (id, name, contact_person, email, phone, address) VALUES
('44444444-4444-4444-4444-444444444444', 'Pfizer Logistics', 'Dr. Sarah Connor', 'connor@pfizer-logistics.com', '+1-555-0199', '235 East 42nd Street, New York, NY'),
('55555555-5555-5555-5555-555555555555', 'Novartis Pharma', 'Michael Vance', 'vance@novartis.com', '+41-61-324-1111', 'Lichtstrasse 35, Basel, Switzerland');

-- 3. Create medicines
INSERT INTO public.medicines (id, name, generic_name, category_id, supplier_id, description, min_stock_threshold, price, status) VALUES
('66666666-6666-6666-6666-666666666666', 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Broad-spectrum penicillin antibiotic used to treat bacterial respiratory infections.', 50, 12.50, 'ACTIVE'),
('77777777-7777-7777-7777-777777777777', 'Paracetamol 650mg', 'Acetaminophen', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Highly effective antipyretic and analgesic tablet compound.', 100, 4.25, 'ACTIVE');
*/
