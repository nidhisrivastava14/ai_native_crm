# Xeno Mini CRM: Complete Deployment Guide (Vercel & Render)

This guide outlines how to deploy the two-service backend system (CRM Backend + Channel Service Simulator) to **Render**, and the React frontend SPA to **Vercel**.

---

## Architecture & URL Endpoints in Production

In production, your services will live on distinct domains and communicate over the web:
- **Frontend SPA (Vercel)**: `https://xeno-crm-client.vercel.app`
- **CRM Backend API (Render)**: `https://xeno-crm-api.onrender.com`
- **Channel Service Simulator (Render)**: `https://xeno-channel-service.onrender.com`

---

## Step 1: Deploy CRM Backend on Render

1. Sign up/Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the CRM codebase.
4. Set the following configuration details:
   - **Name**: `xeno-crm-api`
   - **Environment / Runtime**: `Node`
   - **Root Directory**: `backend` (if your repository has it in a subfolder)
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan Type**: `Free` (or custom)
5. Add the following **Environment Variables** in the Render settings tab:
   - `DATABASE_URL`: Your Supabase connection string (e.g., `postgresql://postgres:[password]...`).
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `CHANNEL_SERVICE_URL`: The URL of your Channel Service simulator (deployed in Step 2, e.g., `https://xeno-channel-service.onrender.com`).
   - `PORT`: `10000` (Render handles binding automatically, but setting this is safe).
   - `CRM_CALLBACK_URL`: `https://xeno-crm-api.onrender.com/api/webhooks/channel-events` (points to itself for callbacks).
6. Click **Deploy Web Service**. Render will install dependencies, compile Node.js, connect to your Supabase instance, and open Port `10000` for API endpoints and WebSockets (`socket.io`).

---

## Step 2: Deploy Channel Service Simulator on Render

Since the Channel Service operates as a separate microservice, deploy it as a second Render service:

1. Click **New +** and select **Web Service**.
2. Connect the same GitHub repository.
3. Configure settings:
   - **Name**: `xeno-channel-service`
   - **Environment / Runtime**: `Node`
   - **Root Directory**: `backend` (it shares the node modules)
   - **Build Command**: `npm install`
   - **Start Command**: `node src/channel-service/index.js`
4. Add the following **Environment Variables**:
   - `CRM_CALLBACK_URL`: The URL of your newly deployed CRM Backend (e.g., `https://xeno-crm-api.onrender.com/api/webhooks/channel-events`).
   - `CHANNEL_SERVICE_PORT`: `10000` (Render binds the standard web port to the `PORT` env variable, so the code listens to this port).
5. Click **Deploy Web Service**. It starts running and will wait to receive post batches at `/simulate`, and trigger callbacks in the background.

---

## Step 3: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** $\rightarrow$ **Project**.
3. Import the GitHub repository.
4. Set the following configuration details:
   - **Framework Preset**: `Vite` (Vercel automatically detects this).
   - **Root Directory**: `frontend`.
   - **Build Command**: `npm run build` (or `vite build`).
   - **Output Directory**: `dist`.
5. Open the **Environment Variables** section and add:
   - `VITE_API_URL`: The URL of your CRM Backend on Render (e.g., `https://xeno-crm-api.onrender.com`).
   - `VITE_WS_URL`: The same URL of your CRM Backend on Render (e.g., `https://xeno-crm-api.onrender.com` - used to establish `socket.io` websocket pipes).
6. Click **Deploy**. Vercel will bundle the React SPA, optimize assets, and distribute the site to their global Edge CDN network.

---

## How CORS & WebSockets Handle Cross-Origin Demands

Because the frontend on Vercel requests data from the Render API domain, the backend's Express server implements **Cross-Origin Resource Sharing (CORS)** and **Socket.io CORS handshakes**:
- **CORS Middleware**: `backend/src/index.js` uses `app.use(cors())` to accept dynamic cross-origin API calls.
- **WebSocket Handshakes**: `backend/src/index.js` configures the `Server(server, { cors: { origin: '*' } })` instance to allow browser socket connections from any origin.
- **Production URL Fallbacks**: The frontend uses `import.meta.env.VITE_API_URL` and `VITE_WS_URL` to route requests to the Render backend, falling back to local proxies only during development.
