# XENO CRM - Video Transcript

**Project:** AI-Native CRM for Customer Segmentation & Revenue Attribution  
**Duration:** 6:03  
**Created:** June 2026  
**Author:** Nidhi  

---

## INTRO (0:00 - 0:32)

Hi, I'm Nidhi. I built Xeno, an AI-native CRM for customer segmentation and revenue attribution.

Instead of writing complex SQL or using rigid segmentation tools, marketers can simply describe their audience in plain English. Xeno uses AI to generate customer segments, create personalized campaign messages, and attribute purchases back to campaigns automatically.

In this demo, I'll walk through the product, the architecture, and the key engineering decisions behind it.

---

## SECTION 1: CHAT & SEGMENTATION (0:32 - 1:10)

### The Interface
So here's the chat interface. I'll describe a customer segment in plain English, just like a marketer would.

### Live Segmentation Query
I'm looking for customers who haven't purchased in the last 30 days and have generated more than twenty thousand in revenue.

Once I submit the query, the AI extracts the segment rules and converts them into database filters. The backend then finds all matching customers.

### Message Generation
The system also generates three campaign message variants:
* An urgent version (creates FOMO)
* A personalized version (warm and personal)
* A value-focused VIP version (exclusive positioning)

### Model Selection for Speed
To keep the experience fast, I use Gemini 2.5 Flash for segmentation and Gemini 2.0 Flash for message generation.

---

## SECTION 2: CAMPAIGN SEND & REAL-TIME STATS (1:12 - 1:32)

### Campaign Sent
Campaign sent. Notice these stats update with no page refresh.

Right now: 0 sent, 0 delivered. A few seconds later, 30 delivered and 12 opened.

### WebSocket Architecture (No Polling)
What's important is that I'm not polling the server or refreshing the page. The backend pushes updates to the frontend in real time using WebSockets, which is the production pattern for high-volume systems.

---

## SECTION 3: ATTRIBUTION WATERFALL (1:33 - 1:52)

### Complete Campaign Attribution
Now here's the part I'm most proud of — the complete attribution waterfall.

We can see:
* 34 sent
* 30 delivered
* 12 opened
* 3 clicked

### Revenue Attribution (48-Hour Window)
If any of those customers make a purchase within 48 hours, that order is automatically attributed to the campaign.

This closes the loop from message sent → revenue generated, giving marketers a complete view of campaign performance.

---

## SECTION 4: ANALYTICS & INSIGHTS (1:53 - 2:10)

### Customer Risk & Value Metrics
Beyond campaign execution, Xeno provides actionable analytics. Customers are grouped by churn risk, and CLV estimates their future value.

### Retention Strategy
This helps marketers identify high-value customers at risk of leaving and target retention efforts where they can drive the most revenue impact.

---

## SECTION 5: ARCHITECTURE DESIGN (2:10 - 2:38)

### System Overview
Let me walk you through the architecture and the reasoning behind it.

I designed Xeno as two services:

* **CRM Backend**
  * AI segmentation (Gemini)
  * Campaign management
  * Analytics
  * PostgreSQL persistence
  * Real-time updates through Socket.io

* **Channel Service (Separate)**
  * Simulates message delivery
  * Processes requests asynchronously
  * Sends webhooks back as campaign status changes

### Why Two Services?
The split provides scalability and isolation. The CRM focuses on business logic, while the channel service handles delivery workflows independently.

---

## SECTION 6: DATA FLOW (2:38 - 3:00)

### Segment Creation Flow
When a user creates a segment:
1. Backend uses Gemini for RFM extraction
2. Query PostgreSQL for matching customers
3. Generate campaign copy
4. Return results to frontend

### Campaign Send Flow
When a campaign is sent:
1. Backend stores everything in a database transaction
2. Forwards the batch to the channel service
3. Immediately returns a response

### Event-Driven Processing
From there, the workflow becomes fully event-driven:
1. Channel service sends webhooks
2. Backend updates message status
3. Broadcasts changes over WebSocket for real-time updates

### The Core Principle
The key idea is simple: asynchronous processing, real-time communication, and zero polling.

---

## SECTION 7: SCALING STRATEGY (3:00 - 3:23)

### MVP (Current)
For this MVP, a single Render instance, PostgreSQL row locking, in-memory state, and one WebSocket server are enough for correctness.

### Production Scale
At production scale, I'd introduce:
* Apache Kafka for event streaming
* Redis for caching and distributed locks
* Event sourcing with materialized views

### Engineering Philosophy
The principle is simple: optimize for clarity and correctness first, then scale when the bottlenecks are real.

---

## SECTION 8: OUT-OF-ORDER WEBHOOK HANDLING (3:23 - 3:50)

### The Problem
The hardest engineering problem I solved was handling out-of-order webhooks.

A message might be opened before the delivered webhook arrives. Without protection, the system would silently lose status information.

### The Solution: Status Hierarchy
To solve this, I built a status hierarchy:
* Pending (rank 0)
* Sent (rank 1)
* Delivered (rank 2)
* Opened (rank 3)
* Clicked (rank 4)

### The Logic
The backend only updates the database if the incoming status has a higher rank than the current one. Otherwise, it's treated as a stale webhook and ignored.

### Why It Matters
At scale, thousands of webhooks arrive out of order. Without this protection, you'd silently lose status information and valuable business insight.

This is the difference between a buggy system and a production-ready one.

---

## SECTION 9: RACE CONDITION PREVENTION (3:50 - 4:15)

### The Attribution Challenge
Next is the attribution service, which connects campaigns to revenue. The challenge here is a race condition.

If two orders arrive for the same customer at nearly the same time, both could try to claim attribution and double-count revenue.

### The Solution: FOR UPDATE Lock
To prevent that, I use a PostgreSQL `FOR UPDATE` lock.

The first transaction claims attribution, while the second waits and then sees the message is already attributed.

### Result
No double-counting, no financial data corruption, and accurate revenue attribution.

---

## SECTION 10: MODEL SELECTION (4:15 - 4:40)

### One Size Does NOT Fit All
One engineering decision worth highlighting is model selection. I use:
* Gemini 2.5 Flash for RFM extraction
* Gemini 2.0 Flash for message generation

### Why Different Models?
The reason is simple:
* RFM extraction is user-facing → latency matters more than creativity
* Message generation runs in the background → output quality matters more than speed

### The Optimization
Rather than using one model everywhere, I chose the right model for each workload. That's a small optimization, but it creates a noticeably better user experience.

---

## SECTION 11: KEY TAKEAWAY (4:40 - 5:36)

### The Role of AI
My biggest takeaway from this project is that AI is great for:
* Exploring ideas
* Scaffolding code
* Challenging assumptions

### Where Engineering Still Wins
But the hard parts — system design, concurrency, and data integrity — still require engineering judgment.

### Confidence & Ownership
I can explain and defend every major decision in this system.

---

## CLOSING

That's Xeno CRM: AI-native, production-ready, and built with intention.

* **Code:** https://github.com/nidhisrivastava14/xenocrm  
* **Live App:** https://xenocrmai.vercel.app/  
* **Duration:** 6:03  
