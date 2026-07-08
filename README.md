# MediStock 🏥

> Modern, professional, enterprise-grade Medical Inventory Management Platform with role-based clinical security, live statistics, and database synchronization.

MediStock is a high-performance, responsive clinical supply chain and medical inventory application built with **React**, **Tailwind CSS**, and **Supabase (PostgreSQL)**. It features an interactive clinical dashboard, strict role-based access controls, append-only immutable logs, and automated alerts for low stock or soon-to-expire clinical assets.

---

## 🎨 Design Philosophy & UX Highlights

* **Ambient Charcoal & Teal Aesthetic**: Built around a clean, high-contrast, eye-safe clinical theme featuring rich greys, soft off-whites, and deep medical blue/teal accent colors.
* **Role-Based Dynamic Interfaces**: Sidebar, menus, and pages adapt automatically to the authenticated user's permission levels (**Admin**, **Pharmacist**, or **Staff**).
* **Responsive Visual Indicators**: Medicine batches, suppliers, and transaction records utilize soft color-coded status badges (e.g., **Healthy Stock**, **Low Stock**, **Expired**, **Near Expiry**).
* **Responsive Layout Design**: Optimized with a responsive collapsible sidebar and mobile overlay drawers, adapting fluidly across phone, tablet, and desktop monitors.

---

## 🛠️ Tech Stack & Architecture

* **Frontend Framework**: React (v18+) with Vite.
* **Routing**: React Router DOM (v6).
* **State Management & Form Handling**: React Hook Form with Yup schema validation.
* **Styling**: Tailwind CSS with custom theme variables.
* **Visualization**: Recharts & Lucide Icons.
* **Backend Database & Auth**: Supabase (PostgreSQL) with Row-Level Security (RLS) and automatic profile triggers.

---

## 🔐 Role-Based Access Control (RBAC)

The application implements three explicit security roles:

| Component / Page | ADMIN 🛡️ | PHARMACIST 🩺 | STAFF (Normal Account) 📋 |
| :--- | :---: | :---: | :---: |
| **Clinical Dashboard** | Full Access | Full Access | Full Access |
| **Medicine Catalog** | Full Access | Full Access | Read-Only Catalog |
| **Medicine Batches & Expiry** | Full Access | Full Access | 🚫 No Access |
| **Category Management** | Full Access | Full Access | 🚫 No Access |
| **Supplier Profiles** | Full Access | Full Access | 🚫 No Access |
| **Purchase Orders & Approval** | Full Access | Full Access | 🚫 No Access |
| **Inventory Transaction Ledger** | Full Access | Full Access | Append-Only (Logs) |
| **Reports & Analytics Center** | Full Access | Full Access | 🚫 No Access |
| **User & Access Management** | Full Access | 🚫 No Access | 🚫 No Access |
| **My Profile & Passwords** | Full Access | Full Access | Full Access |

---

## ⚡ How to Add Admin/Pharmacist Roles Directly in Supabase

When a user signs up through the frontend, they default to the **STAFF** role. There are two quick ways to promote or assign roles directly inside your Supabase project:

### Method 1: Via the Supabase SQL Editor (Recommended)

1. Open your **Supabase Dashboard**.
2. Click on the **SQL Editor** tab on the left sidebar.
3. To promote a user to **ADMIN** or **PHARMACIST**, execute the following query replacing `'your-user-uuid'` with the user's actual Auth UUID:

```sql
-- 1. Promote a user to Admin
UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = 'USER-AUTH-UUID-HERE';

-- 2. Promote a user to Pharmacist
UPDATE public.profiles
SET role = 'PHARMACIST'
WHERE id = 'USER-AUTH-UUID-HERE';
```

4. To verify the change, query the profiles table:
```sql
SELECT id, email, role, status FROM public.profiles;
```

---

### Method 2: Via the Supabase Table Editor UI

1. Open the **Supabase Dashboard** and go to **Authentication** > **Users** to find the user's ID (`UUID`).
2. Navigate to the **Table Editor** tab, select the `profiles` table under the `public` schema.
3. Locate the row corresponding to your user, double-click the `role` column, and select or input `'ADMIN'` or `'PHARMACIST'`.
4. Click **Save** to commit. The application will instantly load the new permissions when they refresh or log in again!

---

### Method 3: First-User Auto Promotion (Built-In Feature)

The database schema (`supabase-schema.sql`) contains a smart initialization trigger:
* The **very first user** to sign up on your newly deployed database is **automatically promoted to ADMIN** for configuration.
* All subsequent users automatically default to the **STAFF** role unless changed via the SQL Editor or passed explicitly in metadata.

---

## 🏃 Getting Started Locally

### 1. Environment Configuration

Create a `.env` file at the root of your workspace (using `.env.example` as a template):
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anonymous_key
```

### 2. Dependency Installation

Install the required npm dependencies:
```bash
npm install
```

### 3. Start Development Server

Run the local development server:
```bash
npm run dev
```
The application will boot on `http://localhost:3000`.

---

## 🩺 System Features Overview

1. **Dashboard Analytics**: Visualizes active pharmaceutical stock metrics, low-stock items count, expiring batch warnings, and supplier distributions using Recharts graphs.
2. **Interactive Search & Global Filters**: Instantly filters medicines, active batches, and historical transaction logs.
3. **Immutable Audit Ledger**: Logged actions under **Inventory Logs** utilize write-once-only database patterns, ensuring a secure and verifiable clinical chain of custody.
4. **Interactive Notifications**: Notifies operators instantly of critical clinical events (e.g., expiry dates approaching or supplies running empty).
