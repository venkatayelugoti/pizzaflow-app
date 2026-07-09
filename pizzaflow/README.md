# PizzaFlow — Production Ready Order & Audit System

PizzaFlow is a highly polished, robust, dual-pipeline pizza ordering platform. It is fully compatible with both the Vercel (Next.js App Router) deployment format and the native full-stack React/Express framework for fast local testing and real-time previews.

## 🚀 Key Architectural Highlights

1. **Dual-Pipeline Backend Pipeline**:
   - Primary: Streams analytical and transactional data directly into **Databricks SQL Engine** (under `colab.colabresult`).
   - Secondary: Captures detailed, real-time audit trail and database operations inside **Supabase Audit Trail** (`pizzaflow_order_audit`), logging transaction statuses (`SUCCESS`, `FAILED`) and underlying database engine errors dynamically.
2. **Instant Billing Logic**:
   - Calculates the exact total: `Total = Base Price + Pizza Price + Topping Price`.
   - Offers an instant **10% discount** when the order quantity is `5` or above.
   - Computes an **18% Goods and Services Tax (GST)** over the post-discount taxable subtotal.
3. **Rigorous Input Sanity Safeguards**:
   - Validation is executed in real-time on the client-side for immediate user feedback.
   - Re-validated securely on the server-side to guarantee clean data inputs across all entry nodes.
   - Name must consist of letters and spaces only, between 2 to 40 characters.
   - Phone must be a 10-digit number starting with 6, 7, 8, or 9 (Indian mobile format).
   - Quantity must be a valid integer between 1 and 10.

---

## 🛠️ Tech Stack & Directory Mapping

- **Vite + React (V19) + Express**: Powers the fast, responsive real-time preview.
- **Next.js (App Router)**: Fully compatible page components and API endpoints generated for production-grade Vercel hosting.
- **Tailwind CSS**: Modern utility styling providing a rich, high-contrast, fully responsive user interface.

### Important File Coordinates
- `/server.ts` — The full-stack Node.js Express server powering the live preview, including `/api/submit-order` routing.
- `/src/App.tsx` — Reactive, interactive React SPA frontend layout.
- `/src/types.ts` — Shared static TypeScript structures, business pricing values, and input validation schemas.
- `/app/page.tsx` — Production Next.js App Router client component.
- `/app/api/submit-order/route.ts` — Next.js Serverless route handler for order submissions.
- `/lib/supabaseClient.ts` & `/lib/supabaseAdmin.ts` — Supabase SDK configurations.
- `/supabase-audit-table.sql` — PostgreSQL script to initialize the audit table.
- `/databricks-target-table.sql` — Databricks Delta Lake script to initialize the target table.

---

## ⚙️ Environment Variables Setup

Configure the following variables in your local `.env` or deployment parameters:

```env
# Databricks SQL Connection details
DATABRICKS_HOST="<your-databricks-server-host>"
DATABRICKS_HTTP_PATH="<your-databricks-http-endpoint-path>"
DATABRICKS_TOKEN="<your-personal-access-token>"
DATABRICKS_SCHEMA="colab"
DATABRICKS_TABLE="colabresult"

# Supabase Auth/Database details
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anonymous-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-secret-service-role-key-backend-only>"
```

---

## 💾 Initialization Database Scripts

### 1. Supabase Audit Table Script
Locally run the query inside `/supabase-audit-table.sql` on your Supabase SQL editor:
```sql
CREATE TABLE pizzaflow_order_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    databricks_status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 2. Databricks Delta Table Script
Run the query inside `/databricks-target-table.sql` on your Databricks SQL query editor:
```sql
CREATE TABLE IF NOT EXISTS colab.colabresult (
  Timestamp TIMESTAMP,
  Customer STRING,
  Phone STRING,
  Base STRING,
  Base_Price DOUBLE,
  Pizza STRING,
  Pizza_Price DOUBLE,
  Topping STRING,
  Topping_Price DOUBLE,
  Quantity INT,
  Unit_Price DOUBLE,
  Subtotal DOUBLE,
  Discount DOUBLE,
  GST DOUBLE,
  Total DOUBLE,
  Payment_Mode STRING
) USING delta;
```
