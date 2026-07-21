# BestBill Admin - Mobile Application Context & Architecture Manual

> **System Prompt for AI Assistants**: 
> This document provides complete context, architecture, backend connection details, and build instructions for the **BestBill Admin** mobile application. Whenever this folder is opened in a workspace, read this document to understand the codebase, database integration, and operational workflows.

---

## 1. Application Overview

**BestBill Admin** is a dedicated native/mobile-responsive application designed for hotel owners to remotely view real-time sales analytics, revenue breakdowns, top-selling dishes, and multi-hotel performance metrics on their smartphones.

* **Companion System**: BestBill POS (`BestBill-Offline` desktop application).
* **Architecture Model**: Offline-First POS with optional 15-minute background cloud sync to Supabase.
* **Security Model**: Row-Level Security (RLS) in PostgreSQL (Supabase) + Owner Passcode protection (**`779207`**) on the desktop POS.

---

## 2. Cloud Architecture & Database Integration

### Cloud Provider: **Supabase** (PostgreSQL)
* **Project Name**: `BestBill-Admin`
* **Project URL**: `https://vcjexpjswlmcicnqywpj.supabase.co`
* **Publishable Anon Key**: `sb_publishable_CHnqfLcl3bhszdDRDyzppA_Hzo9gsvH`
* **Data Retention Policy**: **15-Month Automated Purge**
  * Old snapshots older than 15 months are automatically deleted via the `purge_old_analytics_snapshots()` PostgreSQL function.

### Database Tables:
1. `public.hotels` (`id`, `owner_id`, `hotel_code`, `hotel_name`, `location`, `phone`)
2. `public.analytics_snapshots` (`id`, `hotel_code`, `owner_id`, `snapshot_date`, `total_revenue`, `total_orders`, `cash_collection`, `online_collection`, `dine_in_sales`, `parcel_sales`, `payment_summary`, `top_items`, `synced_at`)

---

## 3. Desktop POS Sync Configuration (`BestBill-Offline`)

* **Background Worker**: `backend/src/services/cloudSyncService.js` runs every 15 minutes when Online Sync is enabled.
* **Passcode Safeguard**: Changing sync settings or toggling sync in Profile Settings requires entering owner passcode **`779207`**.
* **Failsafe**: Network failures, offline periods, or cloud timeouts fail silently in the background without affecting local cashier billing or thermal printing.

---

## 4. Mobile App Features (`BestBill-Admin`)

1. **Multi-Hotel Switcher**: Dropdown in the header to view metrics for individual hotel outlets or an aggregated **"All Hotels Combined"** overview.
2. **Date Range Filters**:
   * ⚡ **Today**
   * 📅 **This Week**
   * 🗓️ **Monthly**
   * 📆 **Yearly**
   * 🔍 **Custom Date Range** (Start Date -> End Date pickers)
3. **Analytics Dashboard**:
   * Total Net Revenue & Order Counts
   * Cash vs UPI / Online Collection Split
   * Dine-In vs Parcel Sales Split
   * Recharts Sales Trend Bar Chart
   * Ranked Top 10 Best-Selling Dishes Table
4. **PDF Report Exporter**: One-tap **"Export PDF Report"** button generating branded PDF reports using `html2canvas` and `jsPDF`.

---

## 5. Development & APK Generation Commands

### Standard Web Development Commands
```bash
# Run local development server (Port 5174)
npm run dev

# Build web production bundle
npm run build
```

### How to Generate Android `.apk` File

The project uses **Capacitor 7** to package the web build into a native Android APK.

#### Step 1: Build & Sync Web Assets
```bash
npm run build
npx cap sync android
```

#### Step 2: Compile Debug `.apk` File (Windows Command Line)
Run the following command in Windows CMD (uses the detected JDK & Android SDK):

```cmd
cmd /c "set JAVA_HOME=D:\BestBill-apk\sdk\jdk-21&& set ANDROID_HOME=D:\BestBill-apk\sdk\android-sdk&& cd /d d:\BestBill-Admin\android && gradlew.bat assembleDebug"
```

#### Step 3: Copy Compiled APK to Root Folder
```powershell
powershell -Command "Copy-Item 'D:\BestBill-Admin\android\app\build\outputs\apk\debug\app-debug.apk' -Destination 'D:\BestBill-Admin\BestBill-Admin.apk' -Force"
```

* **Generated APK Path**: `d:\BestBill-Admin\BestBill-Admin.apk`

---

## 6. Directory Structure & Key Files

```
d:\BestBill-Admin\
├── .env                       # Pre-configured Supabase URL & Anon Key
├── capacitor.config.json      # Capacitor Android app ID & configuration
├── CONTEXT.md                 # System manual for AI context & operations
├── package.json               # App dependencies (React, Recharts, jsPDF, Supabase SDK)
├── vite.config.js             # Vite build & port configuration
├── android/                   # Native Android Studio Gradle project
├── dist/                      # Production web bundle
└── src/
    ├── App.jsx                # Session router & auth state manager
    ├── main.jsx               # Entry point
    ├── index.css              # Dark theme CSS utilities & glassmorphic styling
    ├── supabaseClient.js      # Supabase SDK initializer
    ├── components/
    │   ├── Header.jsx         # Header bar with Multi-Hotel Switcher
    │   ├── DateFilter.jsx     # Date filter pills & PDF export trigger
    │   ├── MetricsCards.jsx   # Revenue, Cash/Online, and Dine-In/Parcel cards
    │   └── TopItemsTable.jsx  # Ranked top-selling dishes table
    ├── pages/
    │   ├── Login.jsx          # Simple Email & Password owner authentication
    │   └── Dashboard.jsx      # Main analytics dashboard & trend charts
    └── utils/
        └── pdfExporter.js     # PDF report generation helper (html2canvas + jsPDF)
```

---

## 7. Guidelines for Future Updates

1. **Authentication**: Maintain simple Email/Password login. Technical Supabase keys should remain pre-configured in `.env`.
2. **Offline Resilience**: When adding new charts or widgets, ensure empty/null data is handled gracefully with fallback states.
3. **Android Builds**: When updating UI components or adding native plugins, always run `npm run build` followed by `npx cap sync android` before building the APK.
