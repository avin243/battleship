import React, { useState } from 'react'

const COLS = ['A', 'B', 'C', 'D', 'E']
const ROWS = ['1', '2', '3', '4', '5']

const SHIPS = [
  { name: 'Battleship', size: 3, icon: '🚢' },
  { name: 'Destroyer', size: 2, icon: '⛵' },
  { name: 'Submarine', size: 1, icon: '🔱' }
]

function cellsFrom(start, size, orientation) {
  const col = start[0]
  const row = start[1]
  const cIndex = COLS.indexOf(col)
  const rIndex = ROWS.indexOf(row)
  const out = []

  for (let i = 0; i < size; i++) {
    const c = orientation === 'H' ? COLS[cIndex + i] : COLS[cIndex]
    const r = orientation === 'V' ? ROWS[rIndex + i] : ROWS[rIndex]
    if (!c || !r) return null
    out.push(c + r)
  }
  return out
}

export default function ShipPlacement({ onPlace, existing = [] }) {
  const [selected, setSelected] = useState(SHIPS[0])
  const [orientation, setOrientation] = useState('H')
  const [placed, setPlaced] = useState([])
  const [error, setError] = useState('')
  const [hoverCell, setHoverCell] = useState(null)

  const availableShips = SHIPS.filter(s => !placed.some(p => p.name === s.name))

  function handleCellClick(c, r) {
    const start = c + r
    const coords = cellsFrom(start, selected.size, orientation)
    
    if (!coords) return setError('Out of bounds!')
    if (placed.some(p => p.name === selected.name)) return setError(selected.name + ' already placed')
    
    for (const p of placed) {
      for (const cc of p.coords) {
        if (coords.includes(cc)) return setError('Overlap detected!')
      }
    }

    const newShip = { name: selected.name, size: selected.size, coords }
    const newPlaced = [...placed, newShip]
    setPlaced(newPlaced)
    setError('')
    setHoverCell(null)

    if (newPlaced.length === SHIPS.length) {
      onPlace(newPlaced)
    } else {
      // Auto-select next available ship
      const nextShip = availableShips.find(s => s.name !== selected.name)
      if (nextShip) setSelected(nextShip)
    }
  }

  function handleCellHover(c, r) {
    if (!selected) return
    const start = c + r
    const coords = cellsFrom(start, selected.size, orientation)
    setHoverCell(coords)
  }

  function reset() {
    setPlaced([])
    setError('')
    setSelected(SHIPS[0])
    setHoverCell(null)
  }

  const isCellInPreview = (cellKey) => {
    return hoverCell && hoverCell.includes(cellKey)
  }

  return (
    <div className="ship-placement">
      <h3 className="ship-placement-title">⚓ Deploy Your Fleet</h3>

      {/* Ship Selector */}
      <div className="ship-selector">
        {SHIPS.map(ship => {
          const isPlaced = placed.some(p => p.name === ship.name)
          const isSelected = selected.name === ship.name
          return (
            <div
              key={ship.name}
              className={`ship-option ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
              onClick={() => !isPlaced && setSelected(ship)}
              style={{ opacity: isPlaced ? 0.4 : 1 }}
            >
              <div className="ship-option-name">{ship.icon} {ship.name}</div>
              <div className="ship-option-size">
                {'█'.repeat(ship.size)} ({ship.size} cells)
              </div>
            </div>
          )
        })}
      </div>

      {/* Orientation Controls */}
      <div className="orientation-controls">
        <button
          className={`orientation-btn ${orientation === 'H' ? 'active' : ''}`}
          onClick={() => setOrientation('H')}
        >
          ⬌ Horizontal
        </button>
        <button
          className={`orientation-btn ${orientation === 'V' ? 'active' : ''}`}
          onClick={() => setOrientation('V')}
        >
          ⬍ Vertical
        </button>
      </div>

      {/* Preview Grid */}
      <div className="board">
        <div className="row-header"></div>
        {COLS.map(c => (
          <div key={c} className="board-header-cell">{c}</div>
        ))}
        {ROWS.map(r => (
          <React.Fragment key={r}>
            <div className="row-header">{r}</div>
            {COLS.map(c => {
              const key = c + r
              const isPlaced = placed.some(s => s.coords.includes(key))
              const inPreview = isCellInPreview(key) && !isPlaced
              return (
                <div
                  key={key}
                  className={`cell ${isPlaced ? 'ship' : ''} ${inPreview ? 'ship' : ''}`}
                  style={inPreview ? { opacity: 0.6 } : {}}
                  onClick={() => !isPlaced && handleCellClick(c, r)}
                  onMouseEnter={() => handleCellHover(c, r)}
                  onMouseLeave={() => setHoverCell(null)}
                >
                  {isPlaced ? '■' : ''}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Placed Ships */}
      {placed.length > 0 && (
        <div className="placed-ships">
          {placed.map(p => (
            <div key={p.name} className="placed-ship-badge">
              {SHIPS.find(s => s.name === p.name)?.icon} {p.name}
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="placement-error">{error}</div>
      )}

      {/* Reset Button */}
      <div className="placement-controls">
        <button className="btn btn-secondary btn-small" onClick={reset}>
          🔄 Reset Fleet
        </button>
      </div>
    </div>
  )
}