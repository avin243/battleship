import React from 'react'

export default function StatusBar({ status, turn, myIdx, phase, room }) {
  const isMyTurn = turn === myIdx

  const getPhaseLabel = () => {
    switch (phase) {
      case 'placement':
        return 'Ship Placement'
      case 'battle':
        return 'Battle'
      case 'finished':
        return 'Game Over'
      default:
        return phase
    }
  }

  const getTurnStatus = () => {
    if (phase === 'placement') return 'Waiting for players...'
    if (phase === 'finished') return 'Game has ended'
    if (isMyTurn) return 'YOUR TURN'
    return 'Opponent\'s Turn'
  }

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">Phase</span>
        <span className="status-value">{getPhaseLabel()}</span>
      </div>

      <div className="turn-indicator">
        <div className="turn-indicator-icon">
          {isMyTurn ? '🎯' : '👁️'}
        </div>
        <div className={`turn-indicator-text ${isMyTurn ? 'active' : ''}`}>
          {getTurnStatus()}
        </div>
      </div>

      <div className="status-item">
        <span className="status-label">Players</span>
        <span className="status-value">
          {room ? `${room.players?.length || 0}/2` : '0/2'}
        </span>
      </div>
    </div>
  )
}