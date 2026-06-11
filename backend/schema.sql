-- ============================================================
-- Schema SQL Script for Xeno Mini CRM
-- Run this in Supabase SQL editor (or any PostgreSQL instance)
-- Author: Xeno Mini CRM - Phase 1
-- ============================================================

-- Enable UUID extension (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE 1: customers
-- Stores individual customer profiles.
-- Each customer has contact info and a city for regional targeting.
-- Used for RFM segmentation across all campaigns.
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  phone       VARCHAR(20)   NOT NULL,          -- Indian format: +91-XXXXXXXXXX
  city        VARCHAR(100)  NOT NULL,          -- Indian cities for geo-targeting
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Indexes on customers
CREATE INDEX IF NOT EXISTS idx_customers_email      ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_city       ON customers (city);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers (created_at);

-- ============================================================
-- TABLE 2: orders
-- Stores purchase history for each customer.
-- This is the core data used to compute R, F, M scores.
-- R = MAX(created_at), F = COUNT(*), M = SUM(amount)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID           NOT NULL,         -- FK → customers.id
  amount      DECIMAL(10, 2) NOT NULL,         -- Amount in Indian Rupees (₹)
  product     VARCHAR(255)   NOT NULL,         -- Fashion item name
  created_at  TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Indexes on orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders (created_at);

-- Foreign key: orders.customer_id → customers.id
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- ============================================================
-- TABLE 3: campaigns
-- Stores each AI-generated marketing campaign.
-- A campaign targets a persona (segment_name), has a message,
-- a chosen channel, and tracks its lifecycle status.
-- ============================================================
CREATE TYPE campaign_status AS ENUM ('pending', 'sending', 'sent', 'completed');

CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_name VARCHAR(255)     NOT NULL,   -- e.g. "Lapsed High-Value", "Champions"
  message      TEXT             NOT NULL,   -- The AI-generated message body
  channel      VARCHAR(50)      NOT NULL,   -- "whatsapp" | "email" | "sms"
  status       campaign_status  NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP        NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- Index on campaigns status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status     ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at);

-- ============================================================
-- TABLE 4: messages
-- One row per (campaign, customer) pair.
-- Tracks the exact delivery journey of each individual message:
-- pending → sent → delivered → opened → clicked (or failed).
-- Populated by the Channel Service via webhook callbacks.
-- ============================================================
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed');

CREATE TABLE IF NOT EXISTS messages (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID           NOT NULL,          -- FK → campaigns.id
  customer_id  UUID           NOT NULL,          -- FK → customers.id
  phone        VARCHAR(20)    NOT NULL,           -- Snapshot of phone at send time
  status       message_status NOT NULL DEFAULT 'pending',
  sent_at      TIMESTAMP,                         -- Nullable: set when message is sent
  delivered_at TIMESTAMP,                         -- Nullable: set on delivery callback
  opened_at    TIMESTAMP,                         -- Nullable: set on open callback
  clicked_at   TIMESTAMP,                         -- Nullable: set on click callback
  created_at   TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Indexes on messages
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages (campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages (customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status      ON messages (status);

-- Foreign key: messages.campaign_id → campaigns.id
ALTER TABLE messages
  ADD CONSTRAINT fk_messages_campaign
  FOREIGN KEY (campaign_id)
  REFERENCES campaigns (id)
  ON DELETE CASCADE;

-- Foreign key: messages.customer_id → customers.id
ALTER TABLE messages
  ADD CONSTRAINT fk_messages_customer
  FOREIGN KEY (customer_id)
  REFERENCES customers (id)
  ON DELETE CASCADE;

-- ============================================================
-- TABLE 5: campaign_stats
-- Aggregated real-time counters for each campaign.
-- Updated incrementally by the CRM backend on each webhook event.
-- One row per campaign (1:1 with campaigns table).
-- Powers the live dashboard with sent/delivered/opened/clicked.
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_stats (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID      NOT NULL UNIQUE,     -- FK → campaigns.id (1:1 relation)
  total_sent      INTEGER   NOT NULL DEFAULT 0,
  total_delivered INTEGER   NOT NULL DEFAULT 0,
  total_opened    INTEGER   NOT NULL DEFAULT 0,
  total_clicked   INTEGER   NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Foreign key: campaign_stats.campaign_id → campaigns.id
ALTER TABLE campaign_stats
  ADD CONSTRAINT fk_campaign_stats_campaign
  FOREIGN KEY (campaign_id)
  REFERENCES campaigns (id)
  ON DELETE CASCADE;

-- ============================================================
-- HELPER: auto-update updated_at on campaigns
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_campaign_stats_updated_at
  BEFORE UPDATE ON campaign_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- VERIFICATION QUERY (run after schema creation)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;
-- Expected: campaign_stats, campaigns, customers, messages, orders
