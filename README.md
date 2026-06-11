# Xeno Mini CRM — Phase 1: Database Setup

> **Phase 1 of 4** · Foundation · PostgreSQL Schema + Seed Data

---

## What's in this folder

| File | Purpose |
|---|---|
| `schema.sql` | PostgreSQL schema — 5 tables, FK constraints, indexes, triggers |
| `seed.js` | Node.js seeder — 500 Indian customers, ~2000+ realistic orders |
| `package.json` | Dependencies: `pg`, `@faker-js/faker`, `dotenv` |
| `.env.example` | Template for your DB connection string |
| `.gitignore` | Keeps `.env` and `node_modules` out of git |

---

## Step 1 — Create the schema in Supabase

1. Go to [supabase.com](https://supabase.com) → your project
2. Open **SQL Editor** (left sidebar)
3. Click **New Query**
4. Paste the entire contents of `schema.sql`
5. Click **Run** (▶)

You should see 5 new tables in the **Table Editor**:
- `customers`
- `orders`
- `campaigns`
- `messages`
- `campaign_stats`

---

## Step 2 — Set up your local environment

```bash
# In this directory
npm install

# Copy the env template
copy .env.example .env
```

Open `.env` and paste your Supabase connection string:
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

> **Where to find it:** Supabase Dashboard → Settings → Database → Connection String → URI tab

---

## Step 3 — Run the seeder

```bash
# Standard run (appends to existing data)
npm run seed

# Fresh run (wipes customers + orders first, then re-seeds)
npm run seed:fresh
```

Expected output:
```
╔══════════════════════════════════════════════════════╗
║       Xeno Mini CRM — Phase 1 Database Seeder       ║
╚══════════════════════════════════════════════════════╝

🔌 Connected to PostgreSQL

📋 Generating customers...
  ✓ 100/500 customers inserted
  ✓ 200/500 customers inserted
  ...
  ✅ All 500 customers inserted

🛍️  Generating orders...
  ✓ Orders generated for 100/500 customers
  ...
  ✅ All orders inserted

📊 RFM Distribution Summary:
────────────────────────────────────────────────────────────
  Recent / High Freq / High Value          87 customers  █████████████████
  Recent / High Freq / Mid Value           64 customers  ████████████
  Dormant / High Freq / High Value         51 customers  ██████████
  ...

╔══════════════════════════════════════════════════════╗
║  ✅ Seeded 500 customers and  2247 orders successfully  ║
╚══════════════════════════════════════════════════════╝
```

---

## Step 4 — Verify in Supabase

Run these in the SQL Editor to confirm:

```sql
-- Should return 500
SELECT COUNT(*) FROM customers;

-- Should return ~2000–3500
SELECT COUNT(*) FROM orders;

-- Quick RFM check
SELECT
  CASE
    WHEN MAX(o.created_at) >= NOW() - INTERVAL '30 days' THEN 'Recent'
    WHEN MAX(o.created_at) >= NOW() - INTERVAL '90 days' THEN 'Medium'
    ELSE 'Dormant'
  END AS recency_bucket,
  COUNT(DISTINCT c.id) AS customers
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY recency_bucket;
```

---

## Database Schema

```
customers
├── id (UUID PK)
├── name
├── email (UNIQUE)
├── phone (+91-XXXXXXXXXX)
├── city
└── created_at

orders
├── id (UUID PK)
├── customer_id (FK → customers)
├── amount (₹ INR)
├── product
└── created_at

campaigns
├── id (UUID PK)
├── segment_name (e.g. "Lapsed High-Value")
├── message (AI-generated text)
├── channel (whatsapp | email | sms)
├── status (pending | sending | sent | completed)
├── created_at
└── updated_at

messages
├── id (UUID PK)
├── campaign_id (FK → campaigns)
├── customer_id (FK → customers)
├── phone
├── status (pending | sent | delivered | opened | clicked | failed)
├── sent_at, delivered_at, opened_at, clicked_at (all nullable)
└── created_at

campaign_stats
├── id (UUID PK)
├── campaign_id (FK → campaigns, UNIQUE)
├── total_sent / total_delivered / total_opened / total_clicked
└── updated_at
```

---

## RFM Seed Distribution

The seeder deliberately creates a realistic RFM spread:

| Persona | Recency | Frequency | % of Customers |
|---|---|---|---|
| **Champions** | 0–30 days | 5+ orders | ~24% |
| **New Customers** | 0–30 days | 1–3 orders | ~16% |
| **Frequent Buyers** | 31–90 days | 4+ orders | ~14% |
| **Potential Loyalists** | 31–90 days | 2–4 orders | ~16% |
| **Lapsed High-Value** | 91–365 days | 3–7 orders | ~15% |
| **At Risk** | 91–365 days | 1–2 orders | ~15% |

This ensures later phases can demo **all** RFM personas convincingly.

---

## What's next — Phase 2

Phase 2 builds the **Express API + LLM chat endpoint**:

```
/api/chat        → Marketer intent → LLM → RFM params + persona + messages
/api/campaigns/send → Creates campaign, triggers Channel Service
/api/webhooks    → Receives delivery callbacks
/api/campaigns/:id/stats → Live dashboard data
```

Stack: Node.js + Express + Groq (free LLM API)
