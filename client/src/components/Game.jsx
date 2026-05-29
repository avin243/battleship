import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import Board from './Board'
import ShipPlacement from './ShipPlacement'
import StatusBar from './StatusBar'
import Modal from './Modal'

const SERVER = import.meta.env.VITE_SERVER || 'http://localhost:4000'

const COLS = ['A', 'B', 'C', 'D', 'E']
const ROWS = ['1', '2', '3', '4', '5']

function makeEmptyAttacks() {
  const m = {}
  for (const c of COLS) for (const r of ROWS) m[c + r] = null
  return m
}

export default function Game() {
  const socketRef = useRef()
  const [connected, setConnected] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [myIdx, setMyIdx] = useState(null)
  const [room, setRoom] = useState(null)
  const [phase, setPhase] = useState('landing')
  const [turn, setTurn] = useState(null)
  const [attacks, setAttacks] = useState(makeEmptyAttacks())
  const [incomingAttacks, setIncomingAttacks] = useState(makeEmptyAttacks())
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info' })
  const [myShips, setMyShips] = useState([])
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [hasPlacedShips, setHasPlacedShips] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Initialize socket connection
  useEffect(() => {
    const s = io(SERVER, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    socketRef.current = s

    s.on('connect', () => {
      console.log('Connected to server:', s.id)
      setConnected(true)
      setStatus('Connected to server')
    })

    s.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
      setStatus('Disconnected from server')
    })

    s.on('connect_error', (err) => {
      console.log('Connection error:', err)
      setStatus('Connection error: ' + err.message)
    })

    return () => s.disconnect()
  }, [])

  // Handle room updates
  useEffect(() => {
    if (!socketRef.current) return
    
    const s = socketRef.current
    
    const handleRoomUpdate = (r) => {
      console.log('Room update received:', r)
      setRoom(r)
      
      // Update myIdx when room updates
      const idx = r.players.findIndex(p => p.socketId === s.id)
      setMyIdx(idx)
      
      // Transition from waiting to placement when both players join
      if (r.players.length === 2 && phase === 'waiting') {
        setPhase('placement')
        setStatus('Both players connected! Place your ships.')
      }
    }
    
    const handleStartGame = ({ turn }) => {
      console.log('Game starting, turn:', turn)
      setPhase('battle')
      setTurn(turn)
      setStatus('⚔️ Battle started!')
      setModal({ open: true, title: 'Battle Begins!', message: 'All ships deployed. Engage the enemy!', type: 'info' })
    }

    const handleAttackResult = ({ coord, hit, by }) => {
      console.log('Attack result:', { coord, hit, by, myIdx })
      if (by === myIdx) {
        setAttacks(prev => ({ ...prev, [coord]: hit ? 'hit' : 'miss' }))
        setStatus(hit ? `💥 Direct hit at ${coord}!` : `💦 Miss at ${coord}`)
      } else {
        setIncomingAttacks(prev => ({ ...prev, [coord]: hit ? 'hit' : 'miss' }))
        if (hit) {
          setMyShips(prev => {
            const copy = prev.map(s => ({ ...s, hits: s.hits ? [...s.hits] : [] }))
            for (const sh of copy) {
              if (sh.coords.includes(coord) && !sh.hits.includes(coord)) {
                sh.hits.push(coord)
              }
            }
            return copy
          })
        }
        setStatus(hit ? `💥 Enemy hit your ship at ${coord}!` : `💦 Enemy missed at ${coord}`)
      }
    }

    const handleTurnUpdate = ({ turn }) => {
      console.log('Turn update:', turn)
      setTurn(turn)
      setStatus(turn === myIdx ? '🎯 Your turn - Fire!' : '👁️ Opponent is targeting...')
    }

    const handleGameOver = ({ winner }) => {
      console.log('Game over, winner:', winner, 'myIdx:', myIdx)
      const isWinner = winner === myIdx
      const msg = isWinner ? '🏆 Victory! You sank all enemy ships!' : '💔 Defeat. Your fleet was destroyed.'
      setStatus(msg)
      setPhase('finished')
      setModal({
        open: true,
        title: isWinner ? 'Victory!' : 'Defeat',
        message: msg,
        type: isWinner ? 'victory' : 'defeat'
      })
    }

    const handleOpponentLeft = () => {
      console.log('Opponent left')
      setStatus('⚠️ Opponent disconnected')
      setPhase('finished')
      setModal({ open: true, title: 'Opponent Left', message: 'Your opponent disconnected from the game.', type: 'warning' })
    }

    const handleShipSunk = ({ by, defender, shipName }) => {
      const you = defender === myIdx
      const who = by === myIdx ? 'You' : 'Opponent'
      setModal({
        open: true,
        title: 'Ship Sunk!',
        message: `${who} sank ${you ? 'your' : "the opponent's"} ${shipName}!`,
        type: 'info'
      })
    }

    s.on('roomUpdate', handleRoomUpdate)
    s.on('startGame', handleStartGame)
    s.on('attackResult', handleAttackResult)
    s.on('turnUpdate', handleTurnUpdate)
    s.on('gameOver', handleGameOver)
    s.on('opponentLeft', handleOpponentLeft)
    s.on('shipSunk', handleShipSunk)

    return () => {
      s.off('roomUpdate', handleRoomUpdate)
      s.off('startGame', handleStartGame)
      s.off('attackResult', handleAttackResult)
      s.off('turnUpdate', handleTurnUpdate)
      s.off('gameOver', handleGameOver)
      s.off('opponentLeft', handleOpponentLeft)
      s.off('shipSunk', handleShipSunk)
    }
  }, [myIdx, phase])

  function createRoom() {
    console.log('Creating room...')
    socketRef.current.emit('createRoom', (res) => {
      console.log('Create room response:', res)
      if (res.ok) {
        setRoomId(res.roomId)
        setPhase('waiting')
        setStatus('Room created! Share code with opponent...')
        setJoinError('')
      } else {
        setJoinError(res.error || 'Failed to create room')
      }
    })
  }

  function joinRoom() {
    if (!roomId.trim()) {
      setJoinError('Please enter a room code')
      return
    }
    
    const code = roomId.trim().toUpperCase()
    console.log('Joining room:', code)
    
    socketRef.current.emit('joinRoom', code, (res) => {
      console.log('Join room response:', res)
      if (res.ok) {
        setRoomId(res.roomId || code)
        setPhase('waiting')
        setStatus('Joined room! Waiting for both players...')
        setJoinError('')
      } else {
        setJoinError(res.error || 'Failed to join room')
        setStatus(res.error || 'Join failed')
      }
    })
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = roomId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function placeShips(ships) {
    console.log('Placing ships:', ships)
    socketRef.current.emit('placeShips', roomId, ships, (res) => {
      console.log('Place ships response:', res)
      if (!res.ok) {
        setModal({ open: true, title: 'Error', message: res.error || 'Placement failed', type: 'warning' })
      } else {
        setMyShips(ships)
        setHasPlacedShips(true)
        setStatus('Fleet deployed! Waiting for opponent to place ships...')
      }
    })
  }

  function attack(coord) {
    if (phase !== 'battle') {
      setStatus('Not in battle phase')
      return
    }
    if (turn !== myIdx) {
      setStatus('Not your turn')
      return
    }
    if (attacks[coord]) {
      setStatus('Already attacked this cell')
      return
    }
    
    console.log('Attacking:', coord)
    socketRef.current.emit('attack', roomId, coord, (res) => {
      console.log('Attack response:', res)
      if (!res.ok) {
        setModal({ open: true, title: 'Error', message: res.error || 'Attack failed', type: 'warning' })
      }
    })
  }

  function rematch() {
    console.log('Rematch requested')
    socketRef.current.emit('rematch', roomId)
    setAttacks(makeEmptyAttacks())
    setIncomingAttacks(makeEmptyAttacks())
    setMyShips([])
    setHasPlacedShips(false)
    setPhase('placement')
    setStatus('Rematch! Place your ships.')
  }

  function goHome() {
    // Reset all state and reconnect
    socketRef.current.disconnect()
    
    const newSocket = io(SERVER)
    socketRef.current = newSocket
    
    setPhase('landing')
    setRoomId('')
    setRoom(null)
    setAttacks(makeEmptyAttacks())
    setIncomingAttacks(makeEmptyAttacks())
    setMyShips([])
    setHasPlacedShips(false)
    setStatus('')
    setTurn(null)
    setMyIdx(null)
    setJoinError('')
    setConnected(false)

    newSocket.on('connect', () => {
      console.log('Reconnected to server:', newSocket.id)
      setConnected(true)
      setStatus('Connected to server')
    })
  }

  // ─── LANDING SCREEN ───
  if (phase === 'landing') {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">⚔️ Battleship 5x5</h1>
          <div className={`connection-status ${connected ? 'connected' : ''}`}>
            {connected ? '🟢 Online' : '🔴 Offline'}
          </div>
        </header>

        <main className="app-main">
          <div className="home-screen">
            <h1 className="home-title">⚔️ BATTLESHIP</h1>
            <p className="home-subtitle">5x5 Naval Combat • Multiplayer</p>

            {joinError && (
              <div className="placement-error" style={{ marginBottom: '20px', maxWidth: '400px' }}>
                {joinError}
              </div>
            )}

            <div className="home-actions">
              <button className="btn btn-primary" onClick={createRoom}>
                🚀 Create Room
              </button>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  className="input"
                  placeholder="ROOM CODE"
                  value={roomId}
                  onChange={e => {
                    setRoomId(e.target.value.toUpperCase())
                    setJoinError('')
                  }}
                  style={{ width: '180px', textAlign: 'center', letterSpacing: '0.2em' }}
                  onKeyDown={e => e.key === 'Enter' && joinRoom()}
                />
                <button className="btn btn-secondary" onClick={joinRoom} disabled={!roomId.trim()}>
                  🎯 Join
                </button>
              </div>
            </div>

            <div style={{ marginTop: '60px', color: 'var(--text-muted)' }}>
              <p>Create a room and share the code with a friend</p>
              <p style={{ marginTop: '10px' }}>💡 Tip: Both players need to place their ships before battle begins</p>
            </div>
          </div>
        </main>

        <Modal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onClose={() => setModal({ open: false, title: '', message: '', type: 'info' })}
        />
      </div>
    )
  }

  // ─── WAITING PHASE ───
  if (phase === 'waiting') {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">⚔️ Battleship 5x5</h1>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div
              className="room-id-display"
              onClick={copyRoomId}
              title="Click to copy"
            >
              {copied ? '✓ Copied!' : roomId}
            </div>
            <button className="btn btn-secondary btn-small" onClick={goHome}>
              ← Leave
            </button>
          </div>
        </header>

        <main className="app-main">
          <div className="status-bar">
            <div className="status-item">
              <span className="status-label">Room</span>
              <span className="status-value">{roomId}</span>
            </div>
            <div className="player-count">
              <div className={`player-dot ${room?.players?.length >= 1 ? 'active' : ''}`}></div>
              <div className={`player-dot ${room?.players?.length >= 2 ? 'active' : ''}`}></div>
              <span>{room?.players?.length || 0}/2 Players</span>
            </div>
            <div className="status-item">
              <span className="status-label">Status</span>
              <span className="status-value">{status || 'Waiting...'}</span>
            </div>
          </div>

          <div className="waiting-card">
            <div className="waiting-icon">⏳</div>
            <h2 className="waiting-title">Waiting for Opponent</h2>
            <p className="waiting-text">Share the room code with your friend to start the battle</p>
            <div
              className="room-id-display"
              style={{ display: 'inline-block', marginTop: '20px', fontSize: '2rem' }}
              onClick={copyRoomId}
            >
              {copied ? '✓ Copied!' : roomId}
            </div>
          </div>
        </main>

        <Modal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onClose={() => setModal({ open: false, title: '', message: '', type: 'info' })}
        />
      </div>
    )
  }

  // ─── PLACEMENT PHASE ───
  if (phase === 'placement') {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">⚔️ Battleship 5x5</h1>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div className="room-id-display" onClick={copyRoomId} title="Click to copy">
              {copied ? '✓ Copied!' : roomId}
            </div>
            <button className="btn btn-secondary btn-small" onClick={goHome}>
              ← Leave
            </button>
          </div>
        </header>

        <main className="app-main">
          <StatusBar
            status={status}
            turn={turn}
            myIdx={myIdx}
            phase={phase}
            room={room}
          />

          <ShipPlacement onPlace={placeShips} existing={myShips} />
        </main>

        <Modal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onClose={() => setModal({ open: false, title: '', message: '', type: 'info' })}
        />
      </div>
    )
  }

  // ─── BATTLE PHASE ───
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">⚔️ Battleship 5x5</h1>
        <div className="room-id-display" onClick={copyRoomId} title="Click to copy">
          {copied ? '✓ Copied!' : roomId}
        </div>
      </header>

      <main className="app-main">
        <StatusBar
          status={status}
          turn={turn}
          myIdx={myIdx}
          phase={phase}
          room={room}
        />

        <div className="boards-section">
          {/* Your Fleet */}
          <div className="board-wrapper">
            <h3 className="board-title">
              <span style={{ fontSize: '1.5rem' }}>🚢</span>
              Your Fleet
              <span className="board-subtitle"> — Defend your waters</span>
            </h3>
            <Board
              isOwn={true}
              ships={myShips}
              attacks={incomingAttacks}
              onCellClick={() => { }}
              disabled={true}
            />
          </div>

          {/* Enemy Waters */}
          <div className="board-wrapper">
            <h3 className="board-title">
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              Enemy Waters
              <span className="board-subtitle"> — Hunt their ships</span>
            </h3>
            <Board
              isOwn={false}
              ships={[]}
              attacks={attacks}
              onCellClick={(coord) => attack(coord)}
              disabled={turn !== myIdx || phase !== 'battle'}
              myTurn={turn === myIdx}
            />
          </div>
        </div>

        {phase === 'finished' && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button className="btn btn-primary" onClick={rematch}>
              🔄 Rematch
            </button>
            <button className="btn btn-secondary" onClick={goHome} style={{ marginLeft: '15px' }}>
              🏠 Main Menu
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Battleship 5x5 • Real-time Naval Combat</p>
      </footer>

      <Modal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={() => setModal({ open: false, title: '', message: '', type: 'info' })}
      />
    </div>
  )
}