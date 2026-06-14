# Xeno CRM: AI-Native Segmentation & Closed-Loop Attribution

Xeno CRM is a high-performance, developer-first customer relationship management engine. It connects plain-English marketing prompts to transactional database actions, orchestrating real-time campaign dispatches while guaranteeing strict revenue attribution.

---

## 🚀 Core Capabilities

### 🤖 Generative Segmentation & Messaging
* **Conversational RFM Engine:** Parses marketer intent (e.g., *"customers who spent > ₹20k but haven't purchased in 30 days"*) into query parameters using Google Gemini.
* **Tonal Message Generation:** Generates automated message variants optimized for **Urgent**, **Value**, and **Personal** communication channels.

### 📊 Closed-Loop Revenue Attribution
* **Last-Touch 48h Window:** Directly links user purchases to campaigns clicked or opened within a strict 48-hour window.
* **Atomic Attribution Safety:** Employs nested SQL `SAVEPOINT`s within a single PostgreSQL transaction. Database errors in attribution automatically fall back to an `organic` sale, preventing order drops.
* **Early-Return Idempotency:** Detects duplicate events at the routing edge to avoid double-processing and database lock exhaustion.

### 📡 Real-Time Dispatch Simulator
* **Live WebSocket Pipeline:** Broadcasts campaign dispatches, delivery statuses, and customer interactions (reads/clicks) via Socket.io.
* **Fallback Channel Routing:** Automatically reroutes messages to backup channels (e.g., falling back from WhatsApp to Email) when contact coordinates are missing.

---

## 🎨 Recent Platform Upgrades

### ⚡ Professional CSV Export Studio
* Integrated client-side unparsing using `papaparse`. Marketers can export campaign metrics, customer lists, and attribution stats into clean, formatted CSVs with a single click.

### 📱 Collapsible Campaigns Workspace
* Redesigned the campaign dashboard with a slide-out detailed configuration panel.
* Features a persistent Floating Action Button (FAB) for workspace toggling, powered by smooth, accelerated CSS animations.

### 🛡️ Attribution & Math Hardening
* **ROI Cap Protection:** Prevents mathematical anomalies (e.g., 140,000% ROI from low per-message costs) by capping displayed ROI metrics at `999%+`.
* **Zero-Division Guards:** Replaced raw percentage divisions with safe defaults to prevent NaN errors on fresh campaigns.
* **Variable Template Correction:** Fixed message copywriting bugs that caused template string leaks in the final drafts.
* **Independent Scrolling Layouts:** Solved layout scroll locks by implementing independent vertical scroll layers across Analytics and Campaigns views.

---

## 🛠️ Stack Architecture

* **Frontend:** React (Vite), Design-Token CSS, Lucide Icons, Socket.io-client, PapaParse.
* **Backend:** Node.js (Express), Socket.io, PostgreSQL (`pg` pool, Row-level Locks).
* **AI Engine:** Google Gemini API.

---

## ⚡ Quickstart

### 1. Database Schema
Execute the SQL DDL in [backend/schema.sql](file:///c:/Users/DELL/OneDrive/Desktop/xenoassignment/backend/schema.sql) in your PostgreSQL query editor to build schema tables and indexes.

### 2. Environment Configuration
Create a `.env` in `backend/` with:
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
CHANNEL_SERVICE_URL=http://localhost:5001
CRM_BASE_URL=http://localhost:5000
```

### 3. Setup and Seed
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Seed mock database entries
cd ../backend
npm run seed:fresh
```

### 4. Running the Stack
Launch three separate terminals from the root:
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Channel Simulator
cd backend && npm run channel:dev

# Terminal 3: React Client
cd frontend && npm run dev
```

---

## 🧪 Integration Tests
Verify the attribution engine and math safeguards:
```bash
cd backend
node __tests__/attribution.test.js
```
