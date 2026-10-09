# ALAALA FUNERAL HOMES - MANAGEMENT SYSTEM

> A complete, production-ready enterprise operations & inventory management system engineered for **Alaala Funeral Homes**, designed from the ground up for modern decoupled deployment: **Vercel** for the React frontend and **Render / Railway / Fly.io** with **PostgreSQL** for the Django REST + Channels backend.

---

## TABLE OF CONTENTS
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Primary Business Goals & Features](#primary-business-goals--features)
5. [Local Development Setup](#local-development-setup)
   - [Prerequisites](#prerequisites)
   - [Backend Setup (Django)](#backend-setup)
   - [Frontend Setup (React + Vite)](#frontend-setup)
   - [SQLite Local Development](#sqlite-setup)
6. [PostgreSQL Production Setup](#postgresql-setup)
7. [Environment Variables](#environment-variables)
   - [Frontend Variables (.env)](#frontend-variables)
   - [Backend Variables (.env)](#backend-variables)
8. [Database Migrations & Seeding](#database-migrations--seeding)
   - [Applying Migrations](#migrations)
   - [Seeding Initial Alaala Records](#seed-data)
   - [Creating Master Admin](#create-master-admin)
9. [Running the Application Locally](#running-the-application)
10. [Building the Frontend](#building-the-frontend)
11. [Vercel Frontend Deployment Instructions](#vercel-deployment)
12. [Backend Deployment Instructions (Render / Railway / Fly.io)](#backend-deployment)
13. [Database Deployment (Neon / Supabase / Render Postgres)](#database-deployment)
14. [Cloud Storage Configuration](#cloud-storage)
15. [CORS & CSRF Configuration](#cors-configuration)
16. [WebSocket Realtime & Fallback Polling](#websocket-configuration)
17. [Production Security Guidelines](#production-security)
18. [Troubleshooting](#troubleshooting)

---

## PROJECT OVERVIEW

**Alaala Funeral Homes Management System** unifies multi-branch inventory tracking, multi-stage laundry process monitoring, casket inventory, chapel maintenance tickets, and utility billing across 7 operational locations:
- `NO COE` (Staging area without Certificate of Embalming)
- `SERVICES` (Main preparation & embalming facilities)
- `C2` (Air-conditioned Viewing Chapel 2)
- `C3` (Air-conditioned Viewing Chapel 3)
- `NC2` (New Chapel 2)
- `NC3` (New Chapel 3)
- `OFFICE` (Central Administrative depot)

The system enforces strict audit accountability, atomic inter-branch stock transfers, negative stock prevention, and exact spreadsheet-aligned laundry workflow accountability.

---

## TECHNOLOGY STACK

### Frontend
- **Framework**: React 18+ with Vite (Vercel-native SPA)
- **Styling**: Tailwind CSS v4 & custom design tokens
- **Icons**: Lucide React
- **Routing**: React Router DOM v6 / v7
- **HTTP Client**: Centralized API service with JWT authentication, token refresh interceptor, and error mapping
- **Realtime**: WebSocket client with automatic reconnection + 20s fallback polling mechanism
- **Build Output**: `dist/`

### Backend
- **Framework**: Python 3.12, Django 5+ & Django REST Framework (DRF)
- **ASGI Server**: Daphne & Django Channels
- **Authentication**: JWT via `djangorestframework-simplejwt`
- **Security & Headers**: `django-cors-headers`, WhiteNoise, secure session cookies
- **Database Engine**: PostgreSQL in production (via `dj-database-url`), SQLite fallback for local development
- **Realtime Transport**: In-memory channel layer or Redis (`channels-redis`)

---

## ARCHITECTURE OVERVIEW

```
                    USERS (Desktop & Mobile)
                              |
                              v
                     ┌─────────────────┐
                     │ VERCEL          │
                     │ React + Vite    │
                     │ Tailwind CSS    │
                     │ vercel.json SPA │
                     └────────┬────────┘
                              |
                              | HTTPS (API Requests)
                              v
                     ┌─────────────────┐
                     │ DJANGO REST API │
                     │ Business Logic  │
                     │ JWT Auth & RBAC │
                     │ Audit Logging   │
                     └────────┬────────┘
                              |
                     ┌────────┴────────┐
                     |                 |
                     v                 v
               ┌───────────┐    ┌──────────────┐
               │ POSTGRES  │    │ CLOUD        │
               │ DATABASE  │    │ STORAGE      │
               │ (Neon/    │    │ (Cloudinary/ │
               │ Supabase) │    │ S3 / R2)     │
               └───────────┘    └──────────────┘

Realtime Architecture:
React Client ──(WSS WebSocket)──> Django Channels (Daphne)
     |
     └──(Fallback 20s Polling)──> DRF Dashboard / Endpoints
```

---

## PRIMARY BUSINESS GOALS & FEATURES

### 1. Instant Operational Visibility (Executive Dashboard)
- **Total Inventory Items & Total Available Quantity**: Across all chapels.
- **Low Stock & Out of Stock Alerts**: Real-time warnings with reorder triggers.
- **Casket Availability**: Available, Reserved, For Repair, and Sold.
- **Laundry In-Process**: Active batches in washing/drying/folding.
- **Open Maintenance**: High & urgent priority facility work orders.
- **Utility Bills**: Outstanding balances for Water & Electricity.

### 2. General Inventory & Multi-Branch Transfers
- Real-time stock status auto-calculation (`AVAILABLE`, `LOW_STOCK`, `OUT_OF_STOCK`).
- **Atomic Stock Transfers**: Transferring 5 towels from `OFFICE` to `C2` atomically reduces `OFFICE` to 15 and increases `C2` by 5.
- **Strict Negative Stock Prevention**: Transactions exceeding stock-on-hand are blocked with clear validation errors.
- Complete transaction ledger: `STOCK IN`, `STOCK OUT`, `TRANSFER`, `ADJUSTMENT`, `RETURN`, `DAMAGED`, `LOST`, `CONSUMED`.

### 3. Exact Laundry Monitoring Sheet (Alaala Excel Format)
Implements the exact 10-column monitoring structure used by Alaala Funeral Homes:
1. **Laundry IN** (Date / Shift / In Charge)
2. **Items**
3. **Quantity**
4. **Laba** (Date / Shift / In Charge)
5. **Banlaw** (Date / Shift / In Charge)
6. **Sampay** (Date / Shift / In Charge)
7. **Pinaw** (Date / Shift / In Charge)
8. **Tiklop** (Date / Shift / In Charge)
9. **Date Returned / By**
10. **Encoded By**

Process cells stack Date, Shift, and Personnel. Complete accountability tracks who received, washed, rinsed, hung, ironed, folded, and returned every batch.

### 4. Casket Inventory
- Models, types (Wood, Metal, Semi-metal, Cremation), sizes, colors, and materials.
- Conditions: `NEW`, `GOOD`, `NEEDS_REPAIR`, `DAMAGED`.
- Statuses: `AVAILABLE`, `RESERVED`, `SOLD`, `USED`, `FOR_REPAIR`, `OUT_OF_STOCK`.
- Reservation tracking with deceased name and contract number.

### 5. Facility Maintenance
- Chapels 2, 3, NC2, NC3, Services, Office, and NO COE.
- Categories: Electrical, Plumbing, Water, AC, Lighting, Furniture, Doors/Locks, etc.
- Priority levels: Low, Medium, High, Urgent.
- Photo attachment support with cloud storage readiness.

### 6. Water & Electricity Monitoring
- Previous and Current meter readings.
- Automatic consumption calculation (`Current - Previous`).
- Billing periods, due dates, payment status (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).

### 7. Reports & Analytics
- Search, filter by location and date range.
- Executive summary metrics across inventory, laundry, caskets, repairs, and utilities.
- One-click CSV export and print-ready stylesheet.

### 8. Role-Based Access Control (RBAC) & Audit Log
- Roles: `MASTER ADMIN`, `ADMIN`, `MANAGER`, `STAFF`.
- Immutable audit log capturing user, module, action, before/after values, IP address, and timestamp.

---

## LOCAL DEVELOPMENT SETUP

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm
- Git

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. (Optional) Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Copy environment variables
copy .env.example .env   # On Windows
# cp .env.example .env   # On Linux/macOS

# 5. Apply database migrations
python manage.py migrate

# 6. Seed initial locations, categories, inventory, laundry, and demo data
python manage.py seed_initial_data

# 7. Create your Master Admin user (interactive)
python manage.py create_master_admin
# Or non-interactive:
# python manage.py create_master_admin --username master --email master@alaalafuneralhomes.com --password MasterAdmin123! --noinput

# 8. Start the Django ASGI development server
python manage.py runserver 127.0.0.1:8000
```

### Frontend Setup

```bash
# 1. In a separate terminal, navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Copy environment variables
copy .env.example .env   # On Windows
# cp .env.example .env   # On Linux/macOS

# 4. Start Vite development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

---

## SQLITE SETUP (LOCAL DEVELOPMENT ONLY)

By default, if the `DATABASE_URL` environment variable is not defined in `backend/.env`, Django automatically uses a local SQLite database at `backend/db.sqlite3`. This provides zero-configuration local setup.

---

## POSTGRESQL PRODUCTION SETUP

In production, SQLite is **strictly prohibited**. The backend uses `dj-database-url` to read your connection string.

Configure `DATABASE_URL` in your production environment:
```
DATABASE_URL=postgresql://username:password@hostname:5432/alaala_db?sslmode=require
```
Compatible providers:
- **Neon Serverless PostgreSQL**
- **Supabase PostgreSQL**
- **Render PostgreSQL**
- **Railway PostgreSQL**

---

## ENVIRONMENT VARIABLES

### Frontend Variables (`frontend/.env`)
Only variables prefixed with `VITE_` are exposed to the client.

```env
# Local Development:
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# Production Example (Vercel):
# VITE_API_URL=https://your-backend.onrender.com/api
# VITE_WS_URL=wss://your-backend.onrender.com/ws
```

### Backend Variables (`backend/.env`)
```env
SECRET_KEY=generate-a-strong-random-key-for-production
DEBUG=False
DATABASE_URL=postgresql://username:password@host:5432/database

# Allowed Hosts (comma-separated backend domains)
ALLOWED_HOSTS=api.alaalafuneralhomes.com,your-backend.onrender.com,localhost,127.0.0.1

# CORS Allowed Origins (comma-separated frontend domains)
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://app.alaalafuneralhomes.com

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,https://your-backend.onrender.com

# Frontend Application URL
FRONTEND_URL=https://your-app.vercel.app

# JWT Signing Secret (optional, defaults to SECRET_KEY)
JWT_SECRET_KEY=

# Cloud Storage (Cloudinary / S3 / R2)
MEDIA_STORAGE=cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Redis for Distributed Channels (optional, falls back to in-memory)
REDIS_URL=
```

---

## DATABASE MIGRATIONS & SEEDING

### Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Seed Data
```bash
python manage.py seed_initial_data
```
This command is **idempotent** (safe to run multiple times without creating duplicates). It sets up:
- 7 Locations: `NO COE`, `SERVICES`, `C2`, `C3`, `NC2`, `NC3`, `OFFICE`
- 5 Standard Inventory Categories
- Sample Inventory across chapels and office
- Multi-stage Laundry records
- Caskets with various conditions and statuses
- Chapel maintenance tickets
- Water and Electricity bills
- Demo Accounts:
  - `admin` / `Admin123!`
  - `manager` / `Manager123!`
  - `staff` / `Staff123!`

### Create Master Admin
```bash
python manage.py create_master_admin
```
Prompts for Username, Email, and Password with no hardcoded passwords.

---

## BUILDING THE FRONTEND

```bash
cd frontend
npm run build
```
Builds the optimized production bundle to `frontend/dist/`.

---

## VERCEL FRONTEND DEPLOYMENT

1. Push this repository to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://your-django-backend.com/api`
   - `VITE_WS_URL` = `wss://your-django-backend.com/ws`
6. Click **Deploy**.
7. The included `frontend/vercel.json` provides SPA routing rewrites so direct navigation to `/login`, `/dashboard`, `/inventory`, `/laundry`, `/caskets`, etc. never produces a 404 error.

---

## BACKEND DEPLOYMENT (RENDER / RAILWAY / FLY.IO)

### Option A: Render.com
1. Create a new **Web Service** on Render and connect your repository.
2. Set **Root Directory** to `backend`.
3. Set **Runtime** to `Python 3`.
4. Set **Build Command**:
   ```bash
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput
   ```
5. Set **Start Command**:
   ```bash
   daphne -b 0.0.0.0 -p $PORT alaala_backend.asgi:application
   ```
6. Add all environment variables from `backend/.env.example` (especially `SECRET_KEY`, `DEBUG=False`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `ALLOWED_HOSTS`).
7. Once deployed, run `python manage.py seed_initial_data` and `python manage.py create_master_admin` via Render Shell.

### Option B: Railway.app
1. Create a new project on Railway and select your repository.
2. Set Root Directory to `/backend`.
3. Railway automatically recognizes the `Procfile`:
   ```
   web: daphne -b 0.0.0.0 -p $PORT alaala_backend.asgi:application
   release: python manage.py migrate --noinput
   ```
4. Add a PostgreSQL database service in Railway and link `DATABASE_URL`.
5. Add backend environment variables.

---

## CLOUD STORAGE

Do **not** store uploaded maintenance photos or documents on the ephemeral local filesystem in production.

Configure your cloud storage provider in `backend/.env`:
- **Cloudinary**: Set `CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name`
- **Amazon S3 / Cloudflare R2**: Set AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`)

---

## WEBSOCKET CONFIGURATION & FALLBACK POLLING

Realtime updates are delivered via Django Channels over WebSockets:
- Development: `ws://localhost:8000/ws/realtime/`
- Production: `wss://api.alaalafuneralhomes.com/ws/realtime/`

### Vercel Fallback Polling Guarantee
Because Vercel serverless environments cannot maintain continuous WebSocket connections to backend workers, the React frontend includes an automatic **fallback polling mechanism**:
- When a WebSocket connection is active, events (`inventory.updated`, `laundry.stage.updated`, `casket.updated`, etc.) update the UI instantaneously.
- If the WebSocket connection is blocked or unavailable, the frontend automatically falls back to refreshing active dashboard metrics every **15–20 seconds**.
- The application remains **100% functional** even when WebSockets are completely offline.

---

## PRODUCTION SECURITY

When `DEBUG=False`:
- `SECURE_BROWSER_XSS_FILTER = True`
- `SECURE_CONTENT_TYPE_NOSNIFF = True`
- `X_FRAME_OPTIONS = 'DENY'`
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`
- `CORS_ALLOW_ALL_ORIGINS = False` (strictly restricted to `CORS_ALLOWED_ORIGINS`)
- Never commit `.env` or database credentials to git.

---

## TESTING

Run the comprehensive automated test suite (14 tests covering authentication, stock calculations, transfers, negative stock prevention, laundry 7-stage workflow, casket tracking, maintenance, and utility calculations):

```bash
cd backend
python manage.py test
```

---

## LICENSE & OWNERSHIP
Proprietary management system designed exclusively for **Alaala Funeral Homes**.
