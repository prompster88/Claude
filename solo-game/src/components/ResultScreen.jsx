import { useEffect, useRef, useState } from 'react'

const MAX_ATTEMPTS = 3

function getShareText(puzzle, attempts, won, streak) {
  const emojis = attempts.map(a => a === puzzle.answer ? '🟡' : '⬛').join('')
  const tries = won ? attempts.length : 'X'
  const streakLine = streak > 1 ? `✦ ${streak} ימים ברצף\n` : ''
  return `SOLO — מצא את האחד\nפאזל #${puzzle.id} | ${tries}/${MAX_ATTEMPTS}\n\n${emojis}\n${streakLine}\nyou're the one.\nsolo.co.il`
}

function spawnParticles(container) {
  const colors = ['#C9A050', '#DDB96A', '#F0D090', '#FFFFFF']
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div')
    p.className = 'particle'
    p.style.cssText = `
      left: ${20 + Math.random() * 60}%;
      animation-delay: ${Math.random() * 0.8}s;
      animation-duration: ${1.2 + Math.random() * 1.6}s;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
    `
    container.appendChild(p)
    setTimeout(() => p.remove(), 3000)
  }
}

export default function ResultScreen({ puzzle, attempts, won, streak }) {
  const particleRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (won && particleRef.current) {
      setTimeout(() => spawnParticles(particleRef.current), 400)
      setTimeout(() => spawnParticles(particleRef.current), 1000)
    }
  }, [won])

  function handleShare() {
    const text = getShareText(puzzle, attempts, won, streak)
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  // ספירה לאחור לפאזל הבא
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const msLeft = tomorrow - now
  const hoursLeft = Math.floor(msLeft / 3600000)
  const minsLeft = Math.floor((msLeft % 3600000) / 60000)

  return (
    <div className={`result-screen ${visible ? 'result-screen--visible' : ''}`}>
      <div ref={particleRef} className="particle-container" aria-hidden="true" />

      {/* תצוגת תשובה */}
      <div className="result-clues">
        {puzzle.clues.map((word, i) => (
          <div
            key={word}
            className={`result-card ${won ? 'result-card--won' : 'result-card--lost'}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className="result-clue-word">{word}</span>
            <span className="result-connector">+</span>
          </div>
        ))}
        <div className={`result-answer-badge ${won ? 'result-answer-badge--won' : 'result-answer-badge--lost'}`}>
          <span className="result-answer-word">{puzzle.answer}</span>
        </div>
      </div>

      {/* דוגמאות */}
      <div className="result-examples">
        {puzzle.clues.map((clue, i) => (
          <span key={i} className="result-example">
            <strong>{puzzle.answer}</strong>{clue}
          </span>
        ))}
      </div>

      {/* הודעה */}
      <div className="result-message">
        {won ? (
          <>
            <p className="result-headline result-headline--won">
              {attempts.length === 1 ? 'ניסיון ראשון. מבריק.' :
               attempts.length === 2 ? 'מצאת.' : 'הגעת לשם.'}
            </p>
            {streak > 1 && (
              <p className="result-streak">✦ {streak} ימים ברצף</p>
            )}
          </>
        ) : (
          <p className="result-headline result-headline--lost">
            האחד חמק הפעם.
          </p>
        )}
        <p className="result-tagline">you're the one.</p>
      </div>

      {/* כפתורי פעולה */}
      <div className="result-actions">
        <button className="share-btn" onClick={handleShare}>
          {copied ? (
            <><span>✓</span> הועתק</>
          ) : (
            <><ShareIcon /> שתף תוצאה</>
          )}
        </button>
        <p className="next-puzzle">
          הפאזל הבא בעוד {hoursLeft}ש׳ {minsLeft}ד׳
        </p>
      </div>

      {/* ריפליי אמוג׳י */}
      <div className="result-replay">
        {attempts.map((a, i) => (
          <span key={i} className={`replay-emoji ${a === puzzle.answer ? 'replay-emoji--win' : ''}`}>
            {a === puzzle.answer ? '🟡' : '⬛'}
          </span>
        ))}
        {won && attempts.length < MAX_ATTEMPTS &&
          Array.from({ length: MAX_ATTEMPTS - attempts.length })
            .map((_, i) => <span key={`e${i}`} className="replay-emoji replay-emoji--empty">⬜</span>)
        }
      </div>

      {/* פוטר מותג */}
      <footer className="result-footer">
        <span className="result-logo">SOLO</span>
        <span className="result-footer-sep">·</span>
        <span className="result-footer-link">solo.co.il</span>
      </footer>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1v-3M10 2h4v4M14 2L7 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
