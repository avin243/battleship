const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Configure Socket.IO for production
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 4000;

// Utilities
const COLS = ['A','B','C','D','E'];
const ROWS = ['1','2','3','4','5'];

function makeEmptyPlayer(){
  return {
    id: null,
    socketId: null,
    ships: [],
    attacks: {}
  }
}

const rooms = {};

function checkAllPlaced(roomId){
  const room = rooms[roomId];
  return room && room.players.length === 2 && room.players.every(p => p.ships && p.ships.length === 3);
}

function allShipsSunk(player){
  for(const s of player.ships){
    for(const c of s.coords){
      if(!s.hits || !s.hits.includes(c)) return false;
    }
  }
  return true;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: Object.keys(rooms).length });
});

app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    msg: 'Battleship server running',
    rooms: Object.keys(rooms).length 
  });
});

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('createRoom', (cb) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = { players: [], turn: 0, phase: 'placement' };
    socket.join(roomId);
    
    const player = makeEmptyPlayer();
    player.id = socket.id;
    player.socketId = socket.id;
    rooms[roomId].players.push(player);
    
    console.log('Room created:', roomId, 'by socket:', socket.id);
    
    if (cb) cb({ ok: true, roomId });
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
  });

  socket.on('joinRoom', (roomId, cb) => {
    const code = roomId.toUpperCase().trim();
    console.log('Join attempt:', code, 'Available rooms:', Object.keys(rooms));
    
    if (!rooms[code]) {
      console.log('Room not found:', code);
      if (cb) cb({ ok: false, error: 'Room not found. Please check the code.' });
      return;
    }
    
    if (rooms[code].players.length >= 2) {
      console.log('Room full:', code);
      if (cb) cb({ ok: false, error: 'Room is full' });
      return;
    }
    
    socket.join(code);
    
    const player = makeEmptyPlayer();
    player.id = socket.id;
    player.socketId = socket.id;
    rooms[code].players.push(player);
    
    console.log('Joined room:', code, 'Total players:', rooms[code].players.length);
    
    if (cb) cb({ ok: true, roomId: code });
    io.to(code).emit('roomUpdate', rooms[code]);
  });

  socket.on('placeShips', (roomId, ships, cb) => {
    const room = rooms[roomId];
    if (!room) {
      if (cb) cb({ ok: false, error: 'Room not found' });
      return;
    }
    
    const idx = room.players.findIndex(p => p.socketId === socket.id);
    if (idx === -1) {
      if (cb) cb({ ok: false, error: 'Player not in room' });
      return;
    }
    
    const expected = { Battleship: 3, Destroyer: 2, Submarine: 1 };
    
    if (!Array.isArray(ships) || ships.length !== Object.keys(expected).length) {
      if (cb) cb({ ok: false, error: 'Must place exactly 3 ships' });
      return;
    }
    
    const names = ships.map(s => s.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== ships.length) {
      if (cb) cb({ ok: false, error: 'Duplicate ship names not allowed' });
      return;
    }

    const seen = new Set();
    for (const s of ships) {
      if (!expected[s.name] || expected[s.name] !== s.coords.length) {
        if (cb) cb({ ok: false, error: 'Invalid ship sizes for ' + s.name });
        return;
      }
      for (const c of s.coords) {
        if (!COLS.includes(c[0]) || !ROWS.includes(c[1])) {
          if (cb) cb({ ok: false, error: 'Invalid coord ' + c });
          return;
        }
        if (seen.has(c)) {
          if (cb) cb({ ok: false, error: 'Overlap at ' + c });
          return;
        }
        seen.add(c);
      }
      s.hits = [];
    }
    
    room.players[idx].ships = ships;
    console.log('Ships placed by player', idx, 'in room', roomId);
    
    io.to(roomId).emit('roomUpdate', room);
    
    if (checkAllPlaced(roomId)) {
      room.phase = 'battle';
      room.turn = Math.floor(Math.random() * 2);
      console.log('All ships placed. Starting game. First turn:', room.turn);
      io.to(roomId).emit('startGame', { turn: room.turn });
    }
    
    if (cb) cb({ ok: true });
  });

  socket.on('attack', (roomId, coord, cb) => {
    const room = rooms[roomId];
    if (!room) {
      if (cb) cb({ ok: false, error: 'Room not found' });
      return;
    }
    
    if (room.phase !== 'battle') {
      if (cb) cb({ ok: false, error: 'Not in battle phase' });
      return;
    }
    
    const attackerIdx = room.players.findIndex(p => p.socketId === socket.id);
    if (attackerIdx !== room.turn) {
      if (cb) cb({ ok: false, error: 'Not your turn' });
      return;
    }
    
    const defenderIdx = 1 - attackerIdx;
    const defender = room.players[defenderIdx];
    
    if (room.players[attackerIdx].attacks[coord]) {
      if (cb) cb({ ok: false, error: 'Already attacked' });
      return;
    }

    let hit = false;
    let hitShipName = null;
    let sunk = false;
    
    for (const s of defender.ships) {
      if (s.coords.includes(coord)) {
        hit = true;
        hitShipName = s.name;
        s.hits = s.hits || [];
        if (!s.hits.includes(coord)) s.hits.push(coord);
        if (s.hits.length === s.coords.length) sunk = true;
      }
    }
    
    room.players[attackerIdx].attacks[coord] = hit ? 'hit' : 'miss';

    const payload = { coord, hit, by: attackerIdx, shipName: hitShipName, sunk, defender: defenderIdx };
    io.to(roomId).emit('attackResult', payload);

    if (hit && sunk) {
      io.to(roomId).emit('shipSunk', { by: attackerIdx, defender: defenderIdx, shipName: hitShipName });
    }

    if (allShipsSunk(defender)) {
      room.phase = 'finished';
      io.to(roomId).emit('gameOver', { winner: attackerIdx });
    } else {
      if (!hit) room.turn = defenderIdx;
      io.to(roomId).emit('turnUpdate', { turn: room.turn });
    }
    
    if (cb) cb({ ok: true, hit, shipName: hitShipName, sunk });
  });

  socket.on('rematch', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    
    room.phase = 'placement';
    room.turn = 0;
    for (const p of room.players) {
      p.ships = [];
      p.attacks = {};
    }
    io.to(roomId).emit('roomUpdate', room);
  });

  socket.on('disconnecting', () => {
    const roomsJoined = Array.from(socket.rooms).filter(r => r !== socket.id);
    for (const roomId of roomsJoined) {
      const room = rooms[roomId];
      if (!room) continue;
      
      room.players = room.players.filter(p => p.socketId !== socket.id);
      io.to(roomId).emit('opponentLeft');
      
      if (room.players.length === 0) {
        delete rooms[roomId];
        console.log('Room deleted:', roomId);
      }
    }
  });
});

server.listen(PORT, () => console.log('Server running on port', PORT));