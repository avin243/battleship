# Battleship 5x5 🚀

A modern, multiplayer Battleship game built with React and Socket.IO.

![Battleship 5x5](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101)

## 🎮 Features

- Real-time multiplayer gameplay
- 5x5 grid with 3 ships per player
- Clean, modern whiteboard-style UI
- Ship placement with preview
- Turn-based combat with hit/miss feedback
- Ship health tracking
- Victory/defeat modals
- Rematch functionality

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

1. **Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend
cd client
npm install
```

2. **Start the backend**
```bash
cd server
npm run dev
```
Server runs on `http://localhost:4000`

3. **Start the frontend** (in a new terminal)
```bash
cd client
npm run dev
```
Client runs on `http://localhost:5173`

4. Open two browser windows and start playing!

## 🌐 Deployment

### Backend → Render

1. Push the `server` folder to its own GitHub repository
2. Go to [render.com](https://render.com)
3. Create a new **Web Service**
4. Connect your GitHub repo
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Deploy and copy your URL (e.g., `https://battleship-server.onrender.com`)

### Frontend → Netlify

1. Push the `client` folder to its own GitHub repository (or configure Netlify to use `client/` as root)
2. Go to [netlify.com](https://netlify.com)
3. Create a new site from Git
4. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Add environment variable:
   - **Key**: `VITE_SERVER`
   - **Value**: Your Render backend URL
6. Deploy!

> ⚠️ **Important**: Set `VITE_SERVER` to your deployed backend URL for production!

## 🎯 How to Play

1. **Create a Room** - Click "Create Room" to generate a unique 6-character code
2. **Share the Code** - Send the code to a friend
3. **Join Game** - Your friend enters the code and clicks "Join"
4. **Place Ships** - Both players place their 3 ships (Battleship, Destroyer, Submarine)
5. **Battle!** - Take turns attacking the enemy grid until one player's ships are all sunk

## 📁 Project Structure

```
battleship(5x5)/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx         # Main app
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Styles
│   └── index.html
├── server/                 # Node.js backend
│   └── index.js           # Socket.IO server
├── DEPLOY.md              # Deployment guide
├── netlify.toml           # Netlify config
└── README.md
```

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Socket.IO Client
- CSS3

**Backend:**
- Node.js
- Express
- Socket.IO
- CORS

## 📝 License

MIT License - Feel free to use and modify!

---

Made with ❤️ for naval warfare enthusiasts