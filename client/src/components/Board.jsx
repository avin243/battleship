import React from 'react'

const COLS = ['A', 'B', 'C', 'D', 'E']
const ROWS = ['1', '2', '3', '4', '5']

const COL_SHIP = ['🛡️', '⚓', '🚢']

function cellKey(c, r) { return c + r }

export default function Board({ isOwn = false, ships = [], attacks = {}, onCellClick, disabled = false, myTurn = false }) {
  const shipCoords = new Set()
  const shipStatus = {}

  for (const s of ships) {
    for (const c of s.coords) shipCoords.add(c)
    shipStatus[s.name] = {
      size: s.size || s.coords.length,
      hits: s.hits ? s.hits.length : 0,
      sunk: s.hits ? s.hits.length === s.coords.length : false
    }
  }

  return (
    <div className="board-wrapper">
      {/* Ship Status Tracker */}
      <div className="ship-status">
        {Object.keys(shipStatus).map(name => (
          <div
            key={name}
            className={`ship-status-item ${shipStatus[name].sunk ? 'sunk' : ''}`}
          >
            <div className="ship-indicator"></div>
            <span>{name}</span>
            <div className="ship-health">
              {[...Array(shipStatus[name].size)].map((_, i) => (
                <div
                  key={i}
                  className={`ship-health-dot ${i < shipStatus[name].hits ? 'damaged' : ''}`}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="board">
        {/* Header row */}
        <div className="row-header"></div>
        {COLS.map(c => (
          <div key={c} className="board-header-cell">{c}</div>
        ))}

        {/* Grid rows */}
        {ROWS.map(r => (
          <React.Fragment key={r}>
            <div className="row-header">{r}</div>
            {COLS.map(c => {
              const key = cellKey(c, r)
              const hasShip = shipCoords.has(key)
              const attack = attacks[key]
              const isTargetable = !disabled && !attack && !isOwn && myTurn

              let classes = ['cell']
              if (hasShip && isOwn) classes.push('ship')
              if (attack === 'hit') classes.push('hit')
              if (attack === 'miss') classes.push('miss')
              if (isTargetable) classes.push('targetable')
              if (disabled && !isOwn) classes.push('disabled')

              return (
                <div
                  key={key}
                  className={classes.join(' ')}
                  onClick={() => {
                    if (disabled) return
                    onCellClick && onCellClick(key)
                  }}
                  title={isOwn ? '' : key}
                ></div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}