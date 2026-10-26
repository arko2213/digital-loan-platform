# Deployment Guide — Digital Loan Platform on Render

This guide walks you through deploying the complete full-stack **Digital Loan Platform** (Node.js/Express Backend + React/Vite Frontend + MongoDB Atlas) to **Render** using a single Web Service on the free tier.

---

## Architecture Overview

```
                          ┌──────────────────────────┐
                          │       User Browser       │
                          └────────────┬─────────────┘
                                       │ HTTPS
                                       ▼
                     ┌───────────────────────────────────┐
                     │       Render Web Service          │
                     │  (Node.js Express + Static React) │
                     │                                   │
                     │   /api/*     ──► REST Endpoints   │
                     │   /* (SPA)   ──► frontend/dist    │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │   MongoDB Atlas (Cloud)  │
                          └──────────────────────────┘
```

The Express server in `backend/server.js` serves both the REST API (`/api/*`) and the built React SPA (`frontend/dist`), eliminating CORS issues and hosting both layers under a single free-tier service with custom domains and automatic SSL certificates.

---

## Prerequisites

1. **GitHub Account**: To host your code repository.
2. **Render Account**: Free account at [render.com](https://render.com).
3. **MongoDB Atlas Account**: Free cloud MongoDB cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).

---

## Step 1: Create a Free MongoDB Atlas Database

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** and select the **M0 Free Tier** (shared cluster in your nearest region, e.g., Mumbai `ap-south-1` or Frankfurt/US).
3. Under **Security Quickstart**:
   - Create a database user with a username and strong password (save these!).
   - In **Network Access / IP Access List**, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`) so Render servers can connect to it.
4. Go to **Clusters** ➔ Click **Connect** ➔ Choose **Drivers** (Node.js).
5. Copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/digitalloan?retryWrites=true&w=majority
   ```
   *(Replace `<username>` and `<password>` with your database user credentials, and add `/digitalloan` as the database name).*

---

## Step 2: Push Your Project to GitHub

In your project directory terminal (PowerShell):

```powershell
# 1. Stage changes including root package.json and render.yaml
git add .

# 2. Commit
git commit -m "Configure full-stack deployment for Render"

# 3. If you haven't pushed to your GitHub repo yet:
# git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
# git branch -M main
# git push -u origin main

# If remote is already set:
git push
```

---

## Step 3: Deploy to Render

### Option A: Using Render Blueprint (Fastest, 1-Click Setup)

This repository includes a [`render.yaml`](./render.yaml) file:

1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click the **New +** button in the top navigation and select **Blueprint**.
3. Connect your GitHub repository (`digital-loan-platform`).
4. Render will parse [`render.yaml`](./render.yaml) and automatically configure:
   - **Service Type**: Web Service
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check**: `/api/health`
5. Under Environment Variables, enter your `MONGODB_URI` from Step 1.
6. Click **Apply**. Render will automatically build the frontend, install dependencies, and launch your application!

---

### Option B: Manual Web Service Setup

If you prefer to configure manually:

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** ➔ **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `digital-loan-platform`
   - **Region**: Nearest to your users (e.g., Singapore, Frankfurt, or Oregon)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced** and click **Add Environment Variable**:

   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production mode |
   | `NODE_VERSION` | `20` | Ensures Node 20 runtime |
   | `MONGODB_URI` | `mongodb+srv://...` | Your Atlas connection string |
   | `JWT_SECRET` | *(click "Generate" or paste random 32+ chars)* | Session encryption key |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration |
   | `ADMIN_EMAIL` | `admin@example.com` *(or your email)* | Designates admin role |
   | `NVIDIA_API_KEY` | *(optional)* | For AI recommendation insights |

5. Under **Health Check Path**, enter:
   ```
   /api/health
   ```
6. Click **Create Web Service**.

---

## Step 4: Verification and Automatic Seeding

Once the deployment finishes building (approx. 2–3 minutes):

1. **Health Check**:
   Visit `https://<your-render-subdomain>.onrender.com/api/health`. You should see:
   ```json
   { "status": "ok", "service": "DigitalLoan API" }
   ```

2. **Automatic Data Seeding**:
   On the very first startup against your MongoDB Atlas cluster, the server will automatically seed:
   - **Authentic Indian Bank Loan Products**: SBI, HDFC, ICICI, Axis, Kotak, Bank of Baroda, PNB, Tata Capital repo-linked rate cards.
   - **Demo Borrower Account**: `demo@digitalloan.com` / `Password123`
   - **Demo Admin Account**: `admin@example.com` (or your `ADMIN_EMAIL`) / `AdminPass123`

3. **Visit Frontend**:
   Open `https://<your-render-subdomain>.onrender.com` in your browser.
   - Test loan browsing and live filtering.
   - Test the EMI calculator and 3-bank loan comparison.
   - Click **Demo Login** or log in with the credentials above.
   - If `ADMIN_EMAIL` matches, visit `/admin` to verify the administrative rate management portal.

---

## Troubleshooting & Tips

- **Free Tier Cold Starts**: Render free instances spin down after 15 minutes of inactivity. The initial request after inactivity may take 30–50 seconds to wake up.
- **Viewing Logs**: In the Render Dashboard, click on your service and choose the **Logs** tab to see startup messages and live API requests.
- **Custom Domains**: Render offers free custom domain support with automatic SSL certificates in **Settings ➔ Custom Domains**.
