# Xeno CRM Setup Checklist

This checklist guides you through the process of executing the reorganization script, placing files, installing dependencies, configuring credentials, seeding the database, and verifying that the full stack runs correctly.

---

## 🛠️ Phase 1: Before Running the Script

- [ ] Ensure that you have committed or backed up all active work. The reorganization script does not delete code files, but safety first is best practice!
- [ ] Make sure your terminal console is opened in the project root directory: `c:\Users\DELL\OneDrive\Desktop\xenoassignment`
- [ ] Confirm you have administrator permissions (required to change PowerShell script execution policy on Windows).

---

## 🚀 Phase 2: Run the Reorganization Script

Run the script designed for your Operating System from the project root:

### Windows (PowerShell)
- [ ] Run the following command in PowerShell:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
  .\setup.ps1
  ```
- [ ] Verify that all success status outputs are marked green in the console.

### macOS / Linux (Bash)
- [ ] Run the following command in Terminal:
  ```bash
  chmod +x setup.sh
  ./setup.sh
  ```
- [ ] Verify that the completion success messages print to the console.

---

## 🔍 Phase 3: Verify Folder Structure

Open your project editor and verify that files have been moved into their correct targets as defined in [FOLDER_STRUCTURE.md](file:///c:/Users/DELL/OneDrive/Desktop/xenoassignment/FOLDER_STRUCTURE.md):

- [ ] Check that `backend/` now contains `src/`, `schema.sql`, `seed.js`, `.env.example`, and `package.json`.
- [ ] Check that `backend/src/` contains `routes/`, `services/`, `channel-service/`, and `index.js`.
- [ ] Check that `frontend/src/components/` contains folders: `Chat/`, `Segment/`, `Messages/`, and `Dashboard/`.
- [ ] Confirm that your root directory only retains root-level files like `.gitignore`, `README.md`, `test-api.http`, and the setup scripts.

---

## 📦 Phase 4: Install Dependencies

Now that the workspaces are clean, install packages for both isolated modules:

### 1. Install Backend Dependencies
- [ ] Navigate to the backend directory and install:
  ```bash
  cd backend
  npm install
  ```

### 2. Install Frontend Dependencies
- [ ] Navigate to the frontend directory and install:
  ```bash
  cd ../frontend
  npm install
  ```

---

## ⚙️ Phase 5: Setup Credentials & Database

Configure your local env parameters to connect to Supabase and Gemini:

- [ ] Navigate to the backend directory:
  ```bash
  cd ../backend
  ```
- [ ] Create a `.env` file from the example:
  - **Windows PowerShell**:
    ```powershell
    Copy-Item .env.example .env
    ```
  - **macOS / Linux**:
    ```bash
    cp .env.example .env
    ```
- [ ] Open the `.env` file in your editor and enter your credentials:
  * **`DATABASE_URL`**: Your Supabase connection string. Remember to replace the password token placeholder with your database password!
  * **`GEMINI_API_KEY`**: Your Gemini API Key from Google AI Studio.
- [ ] Connect to your Supabase SQL Editor and run the SQL table structures from [schema.sql](file:///c:/Users/DELL/OneDrive/Desktop/xenoassignment/backend/schema.sql).
- [ ] Run the database seed script to import 500 customers and 2000+ orders:
  ```bash
  npm run seed
  ```
- [ ] Confirm you see the success banner: `✅ Seeded 500 customers and XXXX orders successfully`.

---

## ⚡ Phase 6: Start All Services

Open three separate terminals at the project root `c:\Users\DELL\OneDrive\Desktop\xenoassignment` to spin up the application:

### Terminal 1: Backend Main Server (Port 3000)
- [ ] Run:
  ```bash
  cd backend
  npm run dev
  ```
- [ ] Confirm connection log: `🔌 New PostgreSQL client connected` and `🚀 Server running on port 3000`.

### Terminal 2: Channel Simulator Microservice (Port 5001)
- [ ] Run:
  ```bash
  cd backend
  npm run channel
  ```
- [ ] Confirm log: `📡 Channel Service Simulator listening on port 5001`.

### Terminal 3: React Vite Client Application (Port 5173)
- [ ] Run:
  ```bash
  cd frontend
  npm run dev
  ```
- [ ] Confirm Vite is live at `http://localhost:5173`.

---

## 🛠️ Troubleshooting & Diagnostics

If you encounter any issues during setup, follow these resolution steps:

### 1. Database Connection Timeout Error (`ETIMEDOUT`)
* **Cause**: Incorrect database URL or password containing special characters that aren't URL-encoded.
* **Fix**: double check your Supabase DB password. If it contains symbols like `@`, `:`, or `/`, make sure you url-encode them, or update the database password in the Supabase Settings console to use alphanumeric characters only, then update `.env`.

### 2. Vite Proxy Error (`ECONNREFUSED` on port 3000)
* **Cause**: Frontend is running, but the backend server on port 3000 hasn't started or crashed.
* **Fix**: Check the console log of **Terminal 1 (Backend)** for runtime crash details. Ensure that your `.env` contains valid keys and that `npm run dev` is actively running.

### 3. Missing `socket.io-client` Events on Dashboard
* **Cause**: Port mismatch or WebSocket proxy issue in `vite.config.js`.
* **Fix**: Ensure that the backend runs on port 3000 and matches the proxy options in `frontend/vite.config.js`. Check that the Socket.io connection in the frontend is utilizing `/socket.io` paths through the proxy rather than attempting to bypass it.
