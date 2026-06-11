// =============================================================
// seed.js — Seed Script for Xeno Mini CRM
// Phase 1: Populates customers + orders with realistic Indian data
//
// Usage:
//   1. cp .env.example .env  → fill in your DATABASE_URL
//   2. npm install
//   3. node seed.js
//
// RFM Distribution:
//   40% Recent buyers    (last order 0–30 days ago)   → Champions / Frequent
//   30% Medium buyers    (last order 30–90 days ago)  → Cooling Off
//   30% Dormant buyers   (last order 90–365 days ago) → Lapsed / At Risk
// =============================================================

require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

// ── Database connection ───────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

// ── Constants ─────────────────────────────────────────────────
const TOTAL_CUSTOMERS = 500;

// Indian cities weighted by population / retail presence
const INDIAN_CITIES = [
  'Mumbai', 'Mumbai', 'Mumbai',         // high weight
  'Delhi', 'Delhi', 'Delhi',
  'Bangalore', 'Bangalore', 'Bangalore',
  'Hyderabad', 'Hyderabad',
  'Chennai', 'Chennai',
  'Pune', 'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Surat',
  'Bhopal',
  'Indore',
  'Nagpur',
  'Chandigarh',
  'Kochi',
  'Coimbatore',
  'Visakhapatnam',
];

// Realistic Indian first names (mix of all regions / genders)
const INDIAN_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun',
  'Reyansh', 'Sai', 'Arnav', 'Ayaan', 'Krishna',
  'Ishaan', 'Shaurya', 'Atharv', 'Advaith', 'Dhruv',
  'Kabir', 'Ritvik', 'Aarush', 'Darsh', 'Veer',
  'Priya', 'Ananya', 'Divya', 'Sneha', 'Pooja',
  'Riya', 'Kavya', 'Meera', 'Nisha', 'Shreya',
  'Isha', 'Aditi', 'Neha', 'Simran', 'Tanvi',
  'Anjali', 'Manvi', 'Diya', 'Aisha', 'Zara',
  'Rahul', 'Rohit', 'Vikram', 'Suresh', 'Manoj',
  'Deepak', 'Nikhil', 'Karan', 'Amit', 'Raj',
  'Sunita', 'Rekha', 'Geeta', 'Lakshmi', 'Savita',
  'Radha', 'Kamla', 'Usha', 'Asha', 'Sudha',
  'Mohammed', 'Imran', 'Faisal', 'Aryan', 'Rohan',
  'Gaurav', 'Sachin', 'Ajay', 'Sanjay', 'Vijay',
  'Pavan', 'Chetan', 'Rajan', 'Harish', 'Girish',
  'Anita', 'Sunita', 'Kavita', 'Smita', 'Rita',
];

// Indian surnames (across regions)
const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar',
  'Patel', 'Shah', 'Mehta', 'Joshi', 'Malhotra',
  'Iyer', 'Nair', 'Pillai', 'Menon', 'Reddy',
  'Rao', 'Naidu', 'Murthy', 'Krishna', 'Subramanian',
  'Chatterjee', 'Mukherjee', 'Banerjee', 'Ghosh', 'Das',
  'Bose', 'Sen', 'Roy', 'Dey', 'Chakraborty',
  'Agarwal', 'Goel', 'Jain', 'Srivastava', 'Mishra',
  'Pandey', 'Tiwari', 'Dubey', 'Yadav', 'Chauhan',
  'Chaudhary', 'Saxena', 'Bhatia', 'Kapoor', 'Khanna',
  'Mehra', 'Arora', 'Bajaj', 'Chopra', 'Taneja',
  'Khan', 'Ali', 'Sheikh', 'Ansari', 'Siddiqui',
  'Narayanan', 'Swamy', 'Hegde', 'Shenoy', 'Bhat',
  'Kulkarni', 'Desai', 'Deshpande', 'Patil', 'Shinde',
  'Marathe', 'Jog', 'Gadgil', 'Kale', 'More',
  'Tata', 'Birla', 'Ambani', 'Adani', 'Mahindra',
];

// Fashion products (retail brand relevant — think Levi's, Tommy, Forever New)
const PRODUCTS = [
  // Tops
  'Classic Oxford Shirt', 'Linen Casual Shirt', 'Striped Polo T-Shirt',
  'Graphic Print Tee', 'Formal Dress Shirt', 'Crew Neck Sweatshirt',
  'Zip-Up Hoodie', 'Oversized Tee', 'Slim Fit Shirt', 'Flannel Check Shirt',

  // Bottoms
  'Slim Fit Jeans', 'Straight Cut Jeans', 'Chino Trousers',
  'Formal Trousers', 'Track Pants', 'Cargo Pants', 'Jogger Pants',
  'Linen Trousers', 'Skinny Jeans', 'Wide Leg Jeans',

  // Dresses & Skirts (women)
  'Floral Midi Dress', 'Wrap Dress', 'Bodycon Dress',
  'A-Line Skirt', 'Pleated Midi Skirt', 'Denim Mini Skirt',
  'Maxi Dress', 'Shift Dress', 'Off-Shoulder Dress', 'Slip Dress',

  // Outerwear
  'Denim Jacket', 'Leather Biker Jacket', 'Puffer Jacket',
  'Trench Coat', 'Blazer', 'Bomber Jacket', 'Windbreaker',
  'Wool Coat', 'Sherpa Fleece Jacket', 'Quilted Vest',

  // Footwear
  'White Sneakers', 'Running Shoes', 'Oxford Shoes',
  'Ankle Boots', 'Heeled Sandals', 'Slip-On Loafers',
  'Chelsea Boots', 'Sports Sandals', 'Ballet Flats', 'Block Heels',

  // Accessories
  'Leather Belt', 'Canvas Tote Bag', 'Leather Crossbody Bag',
  'Backpack', 'Sunglasses', 'Woolen Scarf', 'Baseball Cap',
  'Leather Wallet', 'Watch Strap', 'Silver Necklace',
  'Statement Earrings', 'Silk Scarf', 'Hair Clips Set',
];

// ── Helper utilities ──────────────────────────────────────────

/**
 * Returns a random item from an array
 */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Returns a random integer between min and max (inclusive)
 */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Returns a random float between min and max, rounded to 2 decimals
 */
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

/**
 * Returns a Date object between `daysAgoMax` and `daysAgoMin` days ago
 */
const randomDateBetween = (daysAgoMax, daysAgoMin = 0) => {
  const now = Date.now();
  const msPerDay = 86_400_000;
  const from = now - daysAgoMax * msPerDay;
  const to   = now - daysAgoMin * msPerDay;
  return new Date(from + Math.random() * (to - from));
};

/**
 * Generates an Indian mobile number in +91-XXXXXXXXXX format.
 * First digit is 6, 7, 8, or 9 (valid Indian mobile prefix).
 */
const indianPhone = () => {
  const prefixes = ['6', '7', '8', '9'];
  const prefix = pick(prefixes);
  const rest = Array.from({ length: 9 }, () => randInt(0, 9)).join('');
  return `+91-${prefix}${rest}`;
};

/**
 * Generates an Indian-style email from a full name.
 * e.g. "Arjun Sharma" → "arjun.sharma47@gmail.com"
 */
const indianEmail = (firstName, lastName, usedEmails) => {
  const domains = ['gmail.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'rediffmail.com'];
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  let email;
  let attempts = 0;
  do {
    const suffix = attempts === 0 ? randInt(10, 99) : randInt(100, 9999);
    email = `${base}${suffix}@${pick(domains)}`;
    attempts++;
  } while (usedEmails.has(email));
  usedEmails.add(email);
  return email;
};

// ── RFM-aware order generation ────────────────────────────────

/**
 * Determines a customer's RFM "bucket" and returns order generation params.
 *
 * Distribution:
 *   40% → Recent   (last order 0–30 days ago)
 *   30% → Medium   (last order 31–90 days ago)
 *   30% → Dormant  (last order 91–365 days ago)
 *
 * Within each recency bucket, frequency and monetary vary to create
 * all four major RFM personas:
 *   Champions, Frequent Buyers, Lapsed High-Value, At Risk
 */
const getRfmProfile = () => {
  const roll = Math.random();

  if (roll < 0.40) {
    // ── RECENT BUYERS (40%) ──────────────────────────────────
    // Last order: 0–30 days ago
    // Sub-split: 60% high-frequency (Champions), 40% low-freq (New/Growing)
    const isHighFreq = Math.random() < 0.60;
    return {
      persona: isHighFreq ? 'Champions' : 'New Customers',
      lastOrderDaysAgoMax: 30,
      lastOrderDaysAgoMin: 0,
      orderCount: isHighFreq ? randInt(5, 10) : randInt(1, 3),
      amountMin: isHighFreq ? 1500 : 500,
      amountMax: isHighFreq ? 5000 : 2500,
      spreadDaysMax: 365,
    };

  } else if (roll < 0.70) {
    // ── MEDIUM RECENCY (30%) ─────────────────────────────────
    // Last order: 31–90 days ago → "Cooling Off"
    const isHighFreq = Math.random() < 0.45;
    return {
      persona: isHighFreq ? 'Frequent Buyers' : 'Potential Loyalists',
      lastOrderDaysAgoMax: 90,
      lastOrderDaysAgoMin: 31,
      orderCount: isHighFreq ? randInt(4, 8) : randInt(2, 4),
      amountMin: isHighFreq ? 1200 : 700,
      amountMax: isHighFreq ? 4500 : 3000,
      spreadDaysMax: 540,
    };

  } else {
    // ── DORMANT BUYERS (30%) ─────────────────────────────────
    // Last order: 91–365 days ago → "Lapsed" or "At Risk"
    const isHighValue = Math.random() < 0.50;
    return {
      persona: isHighValue ? 'Lapsed High-Value' : 'At Risk',
      lastOrderDaysAgoMax: 365,
      lastOrderDaysAgoMin: 91,
      orderCount: isHighValue ? randInt(3, 7) : randInt(1, 2),
      amountMin: isHighValue ? 1800 : 500,
      amountMax: isHighValue ? 5000 : 2000,
      spreadDaysMax: 730,
    };
  }
};

// ── Core seeding functions ────────────────────────────────────

/**
 * Seeds all 500 customers into the DB and returns an array of
 * { id, phone, rfmProfile } for use in order generation.
 */
async function seedCustomers(client) {
  console.log('\n📋 Generating customers...');
  const usedEmails = new Set();
  const customers = [];

  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const firstName  = pick(INDIAN_FIRST_NAMES);
    const lastName   = pick(INDIAN_LAST_NAMES);
    const name       = `${firstName} ${lastName}`;
    const email      = indianEmail(firstName, lastName, usedEmails);
    const phone      = indianPhone();
    const city       = pick(INDIAN_CITIES);
    // Signup date: anywhere in the last 2 years
    const createdAt  = randomDateBetween(730, 0);
    const rfmProfile = getRfmProfile();

    const result = await client.query(
      `INSERT INTO customers (name, email, phone, city, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, email, phone, city, createdAt]
    );

    customers.push({
      id: result.rows[0].id,
      phone,
      rfmProfile,
    });

    // Progress indicator every 100 customers
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`  ✓ ${i + 1}/${TOTAL_CUSTOMERS} customers inserted\n`);
    }
  }

  console.log(`  ✅ All ${TOTAL_CUSTOMERS} customers inserted`);
  return customers;
}

/**
 * Seeds orders for every customer, respecting their RFM profile.
 * Returns total order count for the success summary.
 */
async function seedOrders(client, customers) {
  console.log('\n🛍️  Generating orders...');
  let totalOrders = 0;

  // We batch-insert orders in chunks for performance
  const BATCH_SIZE = 100;
  let batch = [];

  const flushBatch = async () => {
    if (batch.length === 0) return;
    // Build parameterized query for the entire batch
    const values = [];
    const placeholders = batch.map((order, i) => {
      const base = i * 4;
      values.push(order.customerId, order.amount, order.product, order.createdAt);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });
    await client.query(
      `INSERT INTO orders (customer_id, amount, product, created_at)
       VALUES ${placeholders.join(', ')}`,
      values
    );
    totalOrders += batch.length;
    batch = [];
  };

  for (let ci = 0; ci < customers.length; ci++) {
    const customer = customers[ci];
    const { rfmProfile } = customer;

    // Determine how many orders this customer made
    const numOrders = rfmProfile.orderCount;

    // Most recent order date (anchored by recency bucket)
    const mostRecentOrderDate = randomDateBetween(
      rfmProfile.lastOrderDaysAgoMax,
      rfmProfile.lastOrderDaysAgoMin
    );

    // All other orders are randomly distributed before the most recent one,
    // within the spread window defined by the profile
    for (let oi = 0; oi < numOrders; oi++) {
      let orderDate;
      if (oi === 0) {
        // First order = the "most recent" anchor
        orderDate = mostRecentOrderDate;
      } else {
        // Spread previous orders over `spreadDaysMax` days before the anchor
        const daysBefore = randInt(1, rfmProfile.spreadDaysMax);
        orderDate = new Date(mostRecentOrderDate.getTime() - daysBefore * 86_400_000);
        // Clamp: don't go more than 2 years back
        const twoYearsAgo = new Date(Date.now() - 730 * 86_400_000);
        if (orderDate < twoYearsAgo) orderDate = twoYearsAgo;
      }

      batch.push({
        customerId: customer.id,
        amount:     randFloat(rfmProfile.amountMin, rfmProfile.amountMax),
        product:    pick(PRODUCTS),
        createdAt:  orderDate,
      });

      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }

    // Progress indicator every 100 customers
    if ((ci + 1) % 100 === 0) {
      process.stdout.write(`  ✓ Orders generated for ${ci + 1}/${customers.length} customers\n`);
    }
  }

  // Flush any remaining orders
  await flushBatch();

  console.log(`  ✅ All orders inserted`);
  return totalOrders;
}

// ── RFM verification query (printed at end) ───────────────────

async function printRfmSummary(client) {
  console.log('\n📊 RFM Distribution Summary:');
  console.log('─'.repeat(60));

  const result = await client.query(`
    WITH rfm AS (
      SELECT
        c.id,
        c.name,
        MAX(o.created_at)                          AS last_order_date,
        COUNT(o.id)                                AS order_count,
        COALESCE(SUM(o.amount), 0)                 AS total_spent,
        NOW() - MAX(o.created_at)                  AS recency_interval
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id, c.name
    ),
    scored AS (
      SELECT
        CASE
          WHEN EXTRACT(DAY FROM recency_interval) <= 30  THEN 'Recent'
          WHEN EXTRACT(DAY FROM recency_interval) <= 90  THEN 'Medium'
          ELSE 'Dormant'
        END AS recency,
        CASE
          WHEN order_count >= 5 THEN 'High Freq'
          WHEN order_count >= 2 THEN 'Med Freq'
          ELSE 'Low Freq'
        END AS frequency,
        CASE
          WHEN total_spent >= 10000 THEN 'High Value'
          WHEN total_spent >= 5000  THEN 'Mid Value'
          ELSE 'Low Value'
        END AS monetary
      FROM rfm
      WHERE last_order_date IS NOT NULL
    )
    SELECT
      recency || ' / ' || frequency || ' / ' || monetary AS rfm_segment,
      COUNT(*) AS customer_count
    FROM scored
    GROUP BY rfm_segment
    ORDER BY customer_count DESC
    LIMIT 15
  `);

  result.rows.forEach(row => {
    const bar = '█'.repeat(Math.ceil(row.customer_count / 5));
    console.log(
      `  ${row.rfm_segment.padEnd(35)} ${String(row.customer_count).padStart(4)} customers  ${bar}`
    );
  });

  console.log('─'.repeat(60));
}

// ── Main entry point ──────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       Xeno Mini CRM — Phase 1 Database Seeder       ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Validate env
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not set in your .env file');
    console.error('   Create a .env file and set: DATABASE_URL=postgresql://...');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log('\n🔌 Connected to PostgreSQL');

    // Wrap everything in a transaction so we can rollback on failure
    await client.query('BEGIN');

    // Optional: clear existing seed data so script is re-runnable
    const args = process.argv.slice(2);
    if (args.includes('--fresh')) {
      console.log('\n🗑️  --fresh flag detected. Clearing existing data...');
      await client.query('DELETE FROM orders');
      await client.query('DELETE FROM customers');
      console.log('  ✓ Cleared orders and customers tables');
    }

    // Seed customers
    const customers = await seedCustomers(client);

    // Seed orders
    const totalOrders = await seedOrders(client, customers);

    // Commit
    await client.query('COMMIT');

    // Print RFM distribution
    await printRfmSummary(client);

    // Final summary
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Seeded ${TOTAL_CUSTOMERS} customers and ${String(totalOrders).padStart(5)} orders successfully  ║`);
    console.log('╚══════════════════════════════════════════════════════╝\n');

    console.log('💡 Next steps:');
    console.log('   1. Verify in Supabase: SELECT COUNT(*) FROM customers;');
    console.log('   2. Verify in Supabase: SELECT COUNT(*) FROM orders;');
    console.log('   3. Move to Phase 2: Build the Express API + LLM chat endpoint\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed. Transaction rolled back.');
    console.error('   Error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
