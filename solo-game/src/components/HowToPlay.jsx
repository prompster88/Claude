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
          <button className="modal-close" onClick={handleClose} aria-label="סגור">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <h2 className="modal-title">מצא את האחד</h2>
        <p className="modal-subtitle">שלוש מילים. חיבור אחד נסתר. אין גבול.</p>

        <div className="modal-steps">
          <div className="modal-step">
            <div className="modal-step-num">1</div>
            <div className="modal-step-body">
              <strong>מצא את המילה המחברת</strong>
              <p>כל מילה מתחברת עם מילה נסתרת אחת ליצירת צירוף. יש לך 3 ניסיונות לפאזל.</p>
            </div>
          </div>

          <div className="modal-step">
            <div className="modal-step-num">2</div>
            <div className="modal-step-body">
              <strong>❤️❤️❤️ שמור על 3 חיים</strong>
              <p>כל פאזל שנכשלת בו עולה חיים אחד. המשחק נגמר כשאוזלים החיים.</p>
            </div>
          </div>

          <div className="modal-step">
            <div className="modal-step-num">3</div>
            <div className="modal-step-body">
              <strong>🔥 בנה רצף לניקוד מטורף</strong>
              <p>3 ברצף = ×1.5 | 5 ברצף = ×2 | 10 ברצף = ×3. ניסיון ראשון = 300 נקודות.</p>
            </div>
          </div>
        </div>

        <div className="modal-example">
          <p className="modal-example-label">דוגמה</p>
          <div className="modal-example-cards">
            <div className="modal-ex-card">רגל</div>
            <div className="modal-ex-card">סל</div>
            <div className="modal-ex-card">עף</div>
          </div>
          <div className="modal-example-answer">
            <span className="modal-answer-arrow">←</span>
            <span className="modal-answer-reveal">כדור</span>
          </div>
          <div className="modal-example-words">
            <span><strong>כדור</strong>רגל</span>
            <span><strong>כדור</strong>סל</span>
            <span><strong>כדור</strong>עף</span>
          </div>
        </div>

        <button className="modal-cta" onClick={handleClose}>
          בוא נשחק
        </button>

        <p className="modal-brand">you're the one.</p>
      </div>
    </div>
  )
}
