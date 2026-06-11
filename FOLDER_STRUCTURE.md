# Xeno Mini CRM — Project Folder Structure Guide

This document defines the target structural architecture for the Xeno Mini CRM project. It serves as the single source of truth for the codebase layout, ensuring a clean separation of concerns between the backend services, the frontend interface, and utility tooling.

---

## 🗺️ Project Architecture Tree

Below is the complete ASCII directory tree representing the final organized structure of the project.

```text
xenoassignment/
├── backend/                              # Main CRM & Simulators Backend
│   ├── src/
│   │   ├── index.js                      # Express API Gateway & Socket.io server
│   │   ├── routes/                       # Express Route Handlers
│   │   │   ├── chat.js                   # NLP query processor (/api/chat)
│   │   │   ├── messages.js               # Message log retriever (/api/messages)
│   │   │   ├── campaigns.js              # Campaign dispatcher (/api/campaigns)
│   │   │   └── webhooks.js               # Webhook listener (/api/webhooks/channel-events)
│   │   ├── services/                     # Business Logic Layer
│   │   │   ├── gemini.js                 # Gemini LLM client configuration
│   │   │   ├── database.js               # PostgreSQL pool & RFM query builder
│   │   │   ├── messageGenerator.js       # AI variant drafts creator
│   │   │   ├── channelOptimizer.js       # Dynamic channel recommender
│   │   │   ├── campaignService.js        # DB campaigns record manager
│   │   │   ├── validationService.js      # Input structure validator
│   │   │   └── webhookService.js         # Event accumulator & socket pusher
│   │   └── channel-service/              # Message Delivery Mock Simulator
│   │       ├── index.js                  # Microservice launcher (Port 5001)
│   │       └── simulator.js              # Delivery/open/click simulation logic
│   ├── schema.sql                        # PostgreSQL tables definition
│   ├── seed.js                           # Customer & Orders data seeder
│   ├── package.json                      # Backend Node.js dependencies
│   ├── .env.example                      # Template for backend credentials
│   └── .env                              # Active environment file (ignored by Git)
│
├── frontend/                             # React Client Web Application
│   ├── src/
│   │   ├── App.jsx                       # Application shell layout
│   │   ├── main.jsx                      # React mounting entrypoint
│   │   ├── index.css                     # Design tokens & Tailwind utility styles
│   │   ├── api/
│   │   │   └── client.js                 # Axios instance with proxy configurations
│   │   ├── hooks/                        # Custom React Hooks
│   │   │   ├── useChat.js                # State machine for the conversational wizard
│   │   │   ├── useCampaign.js            # Dispatcher for campaigns sends
│   │   │   ├── useSocket.js              # Connection manager for socket connections
│   │   │   └── useWebSocket.js           # Real-time state syncing listener
│   │   ├── utils/                        # Frontend Helpers
│   │   │   └── calculations.js           # Math, time-ago, and status formatters
│   │   └── components/                   # React UI Components
│   │       ├── ChatInterface.jsx         # Main orchestrator dashboard view
│   │       ├── Chat/                     # Interactive Chat Components
│   │       │   ├── ChatBubbles.jsx       # Chat speech bubble streams
│   │       │   └── ChatInput.jsx         # Query input textarea & buttons
│   │       ├── Segment/                  # Audience Preview Components
│   │       │   └── SegmentPreview.jsx    # Table grid for target customers list
│   │       ├── Messages/                 # Message Variant Management
│   │       │   ├── MessageVariants.jsx   # Variants list selector
│   │       │   └── MessageVariantCard.jsx# Card component showing tones
│   │       └── Dashboard/                # Live Monitoring Panels
│   │           ├── CampaignDashboard.jsx # Parent real-time monitor panel
│   │           ├── StatCard.jsx          # Live metric card with counter animation
│   │           ├── CampaignInfo.jsx      # Campaign metadata details header
│   │           ├── EngagementTimeline.jsx# Custom funnel drop-off diagram
│   │           └── CampaignStats.jsx     # Legacy flat dashboard layout
│   ├── package.json                      # Frontend Node.js dependencies
│   ├── .env.local                        # Frontend local environment options
│   └── index.html                        # Vite browser entrypoint html template
│
├── .gitignore                            # Root git exclusion patterns
├── README.md                             # Overall developer documentation
└── test-api.http                         # REST client testing configurations
```

---

## 📂 Structural Breakdown & Rationale

To maintain scale, this project is split into a **Three-Tier Separation Architecture**:
1. **Root Configuration**: Houses global rules, documentation, and the testing suite.
2. **Backend microservices**: Fully self-contained Node.js module that is isolated from the React build system.
3. **Frontend Client**: Client UI built with Vite, React, and CSS design sheets.

---

### ⚙️ The Backend Services Layer (Why 7 Files?)

Rather than putting database queries and AI prompts into Express route handlers, the business logic is decoupled into `backend/src/services/`. This folder contains exactly seven specialized modules:

1. **`database.js`**: Connects to the database and converts RFM parameter JSON payloads into complex, aggregated PostgreSQL query strings (filtering by Recency, Frequency, and Monetary parameters using the `HAVING` clause).
2. **`gemini.js`**: Houses integration with the `@google/generative-ai` SDK, defining system prompts that guide Gemini to return structured, validated JSON responses.
3. **`messageGenerator.js`**: Generates three copy drafts (Urgent, Personal, Value) utilizing custom psychological triggers based on RFM segment characteristics.
4. **`channelOptimizer.js`**: Implements CRM logic to determine if WhatsApp, Email, or SMS is the most suitable channel for a specific customer persona.
5. **`campaignService.js`**: Writes campaign records and creates bulk delivery logs (`messages` table rows) in database transactions.
6. **`validationService.js`**: Sanitizes payload structures for campaigns, chat messages, and webhooks before database entry.
7. **`webhookService.js`**: Processes events from the Channel Simulator, updates campaign aggregations, and broadcasts updates via WebSocket.

---

### 🎨 The Frontend UI Layer (Why Subfolders?)

The frontend source structure isolates UI components from business hooks:

* **`api/`**: Centralizes API communication logic, separating HTTP code from UI files.
* **`hooks/`**: Manages state logic (chat history, active socket listeners, HTTP request states) in clean React hooks.
* **`components/`**: Uses subfolders to categorize components by their stage in the user flow:
  * `Chat/` handles the customer query phase.
  * `Segment/` previews matching customers.
  * `Messages/` presents draft options.
  * `Dashboard/` provides real-time campaign stats during active deliveries.

---

## 📍 File Mapping Reference

When migrating files, use this index to place files in their correct folders:

| Original Source Location | Target Location | Status |
| :--- | :--- | :--- |
| `src/index.js` | `backend/src/index.js` | Existing (Reorganized) |
| `src/routes/*` | `backend/src/routes/*` | Existing (Reorganized) |
| `src/services/*` | `backend/src/services/*` | Existing (Reorganized) |
| `src/channel-service/*` | `backend/src/channel-service/*` | Existing (Reorganized) |
| `schema.sql` | `backend/schema.sql` | Existing (Moved) |
| `seed.js` | `backend/seed.js` | Existing (Moved) |
| `.env.example` | `backend/.env.example` | Existing (Moved) |
| `package.json` (Root) | `backend/package.json` | Existing (Moved & Cleaned) |
| `frontend/src/App.jsx` | `frontend/src/App.jsx` | Existing |
| `frontend/src/main.jsx` | `frontend/src/main.jsx` | Existing |
| `frontend/src/index.css` | `frontend/src/index.css` | Existing |
| `frontend/src/api/*` | `frontend/src/api/*` | Existing |
| `frontend/src/hooks/*` | `frontend/src/hooks/*` | Existing |
| `frontend/src/utils/*` | `frontend/src/utils/*` | Existing |
| `frontend/src/components/*` | `frontend/src/components/*` | Existing (Subfolded) |
| `frontend/package.json` | `frontend/package.json` | Existing |
| `frontend/index.html` | `frontend/index.html` | Existing |
| `README.md` | `README.md` | Existing (Root) |
| `test-api.http` | `test-api.http` | Existing (Root) |
| `.gitignore` | `.gitignore` | Existing (Root) |
