import { useEffect, useState } from 'react'

export default function HowToPlay({ onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div className={`modal-overlay ${visible ? 'modal-overlay--visible' : ''}`} onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-logo">SOLO</span>
          <button className="modal-close" onClick={handleClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <h2 className="modal-title">Find The One</h2>
        <p className="modal-subtitle">Three words. One hidden connection.</p>

        <div className="modal-steps">
          <div className="modal-step">
            <div className="modal-step-num">1</div>
            <div className="modal-step-body">
              <strong>Read the three clue words</strong>
              <p>Each clue combines with a single word to form a compound word or phrase.</p>
            </div>
          </div>

          <div className="modal-step">
            <div className="modal-step-num">2</div>
            <div className="modal-step-body">
              <strong>Type The One connecting word</strong>
              <p>You get three attempts. Think lateral — the connection might surprise you.</p>
            </div>
          </div>

          <div className="modal-step">
            <div className="modal-step-num">3</div>
            <div className="modal-step-body">
              <strong>Share your result</strong>
              <p>A new puzzle drops every day. Build your streak.</p>
            </div>
          </div>
        </div>

        {/* Example */}
        <div className="modal-example">
          <p className="modal-example-label">EXAMPLE</p>
          <div className="modal-example-cards">
            <div className="modal-ex-card">NET</div>
            <div className="modal-ex-card">FIRE</div>
            <div className="modal-ex-card">FRAME</div>
          </div>
          <div className="modal-example-answer">
            <span className="modal-answer-arrow">→</span>
            <span className="modal-answer-reveal">WORK</span>
          </div>
          <div className="modal-example-words">
            <span>net<strong>work</strong></span>
            <span>fire<strong>work</strong></span>
            <span>frame<strong>work</strong></span>
          </div>
        </div>

        <button className="modal-cta" onClick={handleClose}>
          Let's play
        </button>

        <p className="modal-brand">you're the one.</p>
      </div>
    </div>
  )
}
