import React from 'react'

export default function Modal({ open, title, message, type = 'info', onClose }) {
  if (!open) return null

  const getIcon = () => {
    switch (type) {
      case 'victory':
        return '🏆'
      case 'defeat':
        return '💔'
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  const getModalClass = () => {
    if (type === 'victory') return 'modal victory'
    if (type === 'defeat') return 'modal defeat'
    return 'modal'
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={getModalClass()}>
        <div className="modal-icon">{getIcon()}</div>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}