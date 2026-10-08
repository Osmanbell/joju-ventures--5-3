# Frozen Foods & Drinks Hub - POS & Inventory System

A complete full-stack Point of Sale (POS), Inventory Management, and CRM application tailored for retail businesses such as frozen food stores and beverage hubs. 

Built with a **React (Vite) + Tailwind CSS** frontend and an **Express (Node.js)** backend, the system includes sophisticated role-based access control, Bluetooth thermal receipt printing, AI-powered business insights (via Google Gemini), and a robust local file-based database for offline-capable operations.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Folder Structure & Architecture](#-folder-structure--architecture)
- [API Endpoints](#-api-endpoints)
- [Role-Based Access Control](#-role-based-access-control)
- [Running the Project](#-running-the-project)

---

## ✨ Features

- **Point of Sale (POS)**: Fast checkout process supporting Cart management, custom discounts, varying payment methods (Cash, POS, Transfer), and loyalty points redemption.
- **Web Bluetooth Printing**: Direct integration with BLE (Bluetooth Low Energy) thermal receipt printers from the browser.
- **Inventory Management**: Track stock quantities, wholesale costs vs. retail pricing, and minimum stock alerts for frozen foods (kg) and drinks (pcs/cartons).
- **CRM & Loyalty**: Track customer purchases, lifetime value, and automate loyalty point allocation (1 point per ₦1000 spent).
- **AI Copilot (Gemini)**: An integrated AI assistant for managers that audits sales data, identifies inventory trends, and suggests operational optimizations based on real store data.
- **Attendant & Shift Management**: Manage cashier profiles, track individual attendant sales performance (shift logs), and period drill-down analyses.
- **Role Scoping**: Secure PIN-based login segregating **Manager** capabilities (access to analytics, costs, AI copilot) from **Attendant** capabilities (restricted to POS and basic customer tracking).
- **Analytics Dashboard**: Visual financial reporting tracking revenue, cost of goods sold (COGS), and net profit over time.

---

## 🛠 Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- TypeScript
- Framer Motion (UI Animations)
- Lucide React (Icons)
- Recharts (Data Visualization)

**Backend:**
- Node.js
- Express.js
- File-based JSON Database (`data/db.json`)
- Google GenAI SDK (`@google/genai`)

---

## 📂 Folder Structure & Architecture

```text
/
├── server.ts                 # Backend Express server (API & Vite middleware)
├── package.json              # Project metadata, dependencies, and scripts
├── vite.config.ts            # Vite bundler configuration
├── tsconfig.json             # TypeScript compiler settings
├── .env.example              # Environment variables template
├── data/
│   └── db.json               # Local JSON database (auto-generated on first run)
└── src/                      # Frontend source code
    ├── main.tsx              # React application entry point
    ├── App.tsx               # Main layout, global state, authentication & tab routing
    ├── index.css             # Global stylesheet & Tailwind CSS injection
    ├── types.ts              # TypeScript interfaces (Product, Customer, Sale, Attendant)
    └── components/           # UI Components
        ├── POS.tsx           # Point of sale interface & Web Bluetooth printing
        ├── Customers.tsx     # Customer CRM and loyalty points management
        ├── Inventory.tsx     # Product catalog & stock level management
        ├── Analytics.tsx     # Manager dashboard, financial graphs, profit analysis
        ├── Attendants.tsx    # Cashier account management & PIN setup
        ├── AttendantStats.tsx# Shift performance, drill-down sales logs, and cashier audits
        └── AICopilot.tsx     # Chat interface for Gemini-powered store insights
```

### Explanation of Key Files

- **`server.ts`**: The core backend file. It mounts API routes (`/api/*`), reads/writes to the `db.json` database file, handles complex business logic (e.g., deducting inventory and assigning loyalty points upon checkout), and acts as a proxy for the Gemini AI calls to keep the API key secure. It also serves the frontend using Vite middleware in development or static files in production.
- **`src/App.tsx`**: Controls the high-level application state (locked/unlocked, manager/attendant role), stores central data states (products, customers, sales), and handles navigation between different feature tabs.
- **`src/components/POS.tsx`**: The core operational screen. Features cart state management, checkout API integration, and experimental Web Bluetooth API logic to scan and connect to physical thermal printers.
- **`src/types.ts`**: Centralized TypeScript definitions ensuring type safety across both frontend components and (via conceptual alignment) the backend data structures.

---

## 🔌 API Endpoints

The Express server (`server.ts`) exposes the following RESTful endpoints:

- **Products**: `GET`, `POST`, `PUT`, `DELETE` on `/api/products`
- **Customers**: `GET`, `POST`, `PUT`, `DELETE` on `/api/customers`
- **Attendants**: `GET`, `POST`, `PUT`, `DELETE` on `/api/attendants`
- **Sales**: 
  - `GET /api/sales`: Retrieve all historical sales logs.
  - `POST /api/sales`: Process a checkout. Automatically deducts stock and awards customer loyalty points.
- **Analytics**: 
  - `GET /api/reports`: Aggregates top-selling products, total revenue, COGS, profit, and monthly financial histories.
- **AI Copilot**: 
  - `POST /api/ai/audit`: Sends a prompt combined with live store data context to the Gemini model for operational auditing.

---

## 🖨️ Bluetooth Thermal Receipt Printing Guide

Real-world retail 58mm and 80mm thermal receipt printers (such as P58E, RPP02N, Xprinter, HOIN, MTP-II) almost universally utilize **Bluetooth Classic (SPP - Serial Port Profile)**. Because web browsers cannot directly open Bluetooth Classic RFCOMM sockets due to sandbox security, modern web POS systems use an **Android Print Bridge** architecture.

### ⭐ Option 1 — Android Phone/Tablet + Bluetooth Printer (Recommended)

This is the fastest, zero-watermark, and most cost-effective hardware setup:

```text
Your Web POS Website → Android Phone/Tablet (Cleanter App) → Bluetooth Classic → 58mm / 80mm Printer
```

#### Step-by-Step Setup:

1. **Pair your Bluetooth Printer with Android:**
   - Power on the 58mm/80mm thermal printer and ensure paper is loaded.
   - On your Android phone or tablet, go to **Settings → Connected Devices / Bluetooth → Pair New Device**.
   - Select your printer (e.g. `P58E`, `Printer001`, `Bluetooth Printer`).
   - Enter default pairing PIN: `0000` or `1234`.

2. **Install Cleanter on Android:**
   - Install **"Cleanter: Thermal Printer BT"** from the Google Play Store (free, offline, zero watermarks).
   - Open Cleanter, select your paired Bluetooth printer, choose paper width (**58mm** or **80mm**), and tap **Start**.
   - Cleanter runs a lightweight local HTTP bridge at `http://localhost:9100`.

3. **Print from the Web POS:**
   - Open this web POS in Chrome on that Android device.
   - In the POS screen, open the **Printer Hub** (top right of the printer card).
   - Select **Cleanter Android Print Bridge (Option 1)**.
   - Tap **Send Test Receipt** to verify immediate physical paper feed and printing.
   - From then on, every completed sale or click on **"Print Receipt"** transmits ESC/POS JSON to Cleanter, which outputs the receipt instantly!

---

### 📱 Option 2 — UpeoRetail Print (Dedicated WebView Kiosk)

If you prefer running the POS as a dedicated full-screen tablet kiosk without browser address bars:
- Use the open-source **UpeoRetail Print** Android app ([GitHub repository](https://github.com/Upeosoft-Limited/upeoretail-bluetooth-printer-connector)).
- It injects a native JavaScript bridge: `window.UpeoRetailPrinter.postMessage()`.
- The POS automatically detects this bridge (`isUpeoRetailAvailable()`) and sends structured JSON print jobs with zero setup required.

---

### 🌐 Other Supported Print Engines:
- **Direct Web Bluetooth (BLE GATT):** For modern BLE-enabled printers via Chrome's native pairing dialog (`navigator.bluetooth`).
- **RawBT Android Print Service:** Deep-linked base64 intent for users using RawBT.
- **System / Browser Print Dialog:** Tailored CSS print styling supporting both `@media print` 58mm roll and 80mm roll dimensions.

---

## 🔐 Role-Based Access Control

The system supports two distinct roles:

1. **Manager (Admin)**
   - Unrestricted access to all modules.
   - Can view sensitive financial data (Costs, Profit Margins, Net Revenue).
   - Access to Analytics, AI Copilot, and Attendant Management.
2. **Attendant (Cashier)**
   - Restricted access focused on operations.
   - Cannot view product wholesale costs or profit margins.
   - Can access **POS**, **Customers**, and **Inventory** (view/stock check only).
   - Can view their own **Shift Stats** (Total Sales Volume, excluding profits).

---

## 🚀 Running the Project

### Environment Variables

Copy the `.env.example` file to a new `.env` file and add your Gemini API Key if you wish to use the AI Copilot.

```bash
cp .env.example .env
```

### Installation & Startup

```bash
# Install all dependencies
npm install

# Start the development server (runs Express + Vite on port 3000)
npm run dev
```

### Production Build

```bash
# Build the frontend and compile the backend
npm run build

# Start the production server
npm start
```
