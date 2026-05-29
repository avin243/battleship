# Battleship 5x5 — Deployment Guide

## Architecture

This is a full-stack multiplayer game with:
- **Frontend**: React + Vite (deploy to Netlify)
- **Backend**: Node.js + Socket.IO (deploy to Render)

## Step 1: Deploy Backend to Render

### 1.1 Push to GitHub
Create a new repository for the backend or use the existing structure. Make sure the `server` folder is at the root of its own repository (or use a monorepo setup).

### 1.2 Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `battleship-server`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: (leave empty if server is at repo root, or specify `server` if using monorepo)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**

### 1.3 Get Your Backend URL
After deployment, you'll get a URL like:
```
https://battleship-server.onrender.com
```
Save this — you'll need it for the frontend.

---

## Step 2: Deploy Frontend to Netlify

### 2.1 Update Client Configuration
Before deploying, make sure the client knows where to connect:

Create a file `client/.env.production`:
```
VITE_SERVER=https://battleship-server.onrender.com
```

### 2.2 Deploy on Netlify
1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository (use the `client` folder as the root)
4. Configure:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variable:
   - **Key**: `VITE_SERVER`
   - **Value**: `https://battleship-server.onrender.com` (your Render URL)
6. Click **"Deploy site"**

### 2.3 Configure for SPA Routing (Optional)
If you want clean URLs, add a `netlify.toml` file:
```toml
[build]
  base = "client"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Step 3: Update README

After deployment, update your game's frontend URL in documentation.

---

## Troubleshooting

### Socket.IO Connection Issues
- Make sure CORS is properly configured on Render
- Check that the `VITE_SERVER` environment variable is set correctly
- Verify the backend URL is accessible: `https://your-backend.onrender.com/`

### Free Tier Limitations (Render)
- Services sleep after 15 minutes of inactivity
- First request after sleep may take 30+ seconds
- For production, consider upgrading to a paid plan

### WebSocket Not Working
- Render's free tier supports WebSocket
- Make sure no reverse proxy is blocking WebSocket connections

---

## Local Development

```bash
# Terminal 1 - Start backend
cd server
npm install
npm run dev

# Terminal 2 - Start frontend
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:4000`

Set `VITE_SERVER=http://localhost:4000` for local development.