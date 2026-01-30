# SMCC Web App Hosting Guide

Follow these steps to host your Cricket Scorecard application for free.

## 1. Prerequisites
- A [GitHub](https://github.com/) account.
- A [Render](https://render.com/) account (for Backend).
- A [Vercel](https://vercel.com/) account (for Frontend).

---

## 2. Setup GitHub Repository
Since your frontend code (`smcc-web`) is not yet in a repository:

1. Create a new repository on GitHub named `smcc-web`.
2. Open a terminal in `smcc-web` folder and run:
   ```bash
   cd smcc-web
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/smcc-web.git
   git push -u origin main
   ```

---

## 3. Database (Cloud MySQL)
You are using MySQL. For hosting, you need a cloud provider.
**Option A: Railway.app (Easiest)**
1. Go to [Railway.app](https://railway.app/).
2. Create a new project -> Provision MySQL.
3. Copy the `MYSQL_URL` connection string.

**Option B: Aiven / PlanetScale**
- Sign up and create a free MySQL database.

---

## 4. Deploy Backend (Render)
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your `smcc-backend` repository.
4. **Settings**:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. **Environment Variables** (Advanced):
   Add the following keys:
   - `DATABASE_URL`: (Paste your Cloud MySQL connection string)
   - `JWT_SECRET`: (Any random secret string)
   - `PORT`: `10000` (Render default)
6. Click **Deploy**.
7. Once live, copy your backend URL (e.g., `https://smcc-backend.onrender.com`).

---

## 5. Deploy Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project**.
3. Import your `smcc-web` repository.
4. **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: (Paste your Render Backend URL, e.g., `https://smcc-backend.onrender.com`)
   *(Note: Do not add a trailing slash `/`)*
5. Click **Deploy**.

---

## 6. Final Steps
- Open your Vercel URL.
- Log in to the app.
- Everything should work live! 🚀

---

## 7. Connect Mobile App
Your Mobile App can also connect to this same backend!

1. **Get the APK**:
   - Go to your [Mobile GitHub Repo](https://github.com/dhanushoas/smcc-mobile).
   - Go to **Actions** tab -> Click the latest workflow.
   - Download the `app-release` artifact (APK).

2. **Configure App**:
   - Install the APK on your Android phone.
   - Open the app and go to the **Profile / Login** screen.
   - Click the **Gear Icon (⚙️)** in the top right corner.
   - Enter your **Render Backend URL** (from Step 4).
     - Example: `https://smcc-backend.onrender.com`
   - Click **Save**.

3. **Login**:
   - Use your Admin credentials (`Admin` / `Admin@321`).
   - The app is now connected to the cloud! Any changes made on the Web App will instantly appear on the Mobile App.
