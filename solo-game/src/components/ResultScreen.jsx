import { useEffect, useRef, useState } from 'react'

const MAX_ATTEMPTS = 3

function getShareEmojis(attempts, answer, won) {
  return attempts.map(a => a === answer.toUpperCase() ? '🟡' : '⬛').join('')
}

function getShareText(puzzle, attempts, won, streak) {
  const emojis = getShareEmojis(attempts, puzzle.answer, won)
  const tries = won ? attempts.length : 'X'
  const streakLine = streak > 1 ? `\n✦ ${streak} day streak` : ''
  return `SOLO — Find The One\nPuzzle #${puzzle.id} | ${tries}/${MAX_ATTEMPTS}\n\n${emojis}\n${streakLine}\nyou're the one.\nsolo.co.il`
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

  // Next puzzle countdown
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const msLeft = tomorrow - now
  const hoursLeft = Math.floor(msLeft / 3600000)
  const minsLeft = Math.floor((msLeft % 3600000) / 60000)

  return (
    <div className={`result-screen ${visible ? 'result-screen--visible' : ''}`}>
      {/* Particle container (absolute, behind content) */}
      <div ref={particleRef} className="particle-container" aria-hidden="true" />

      {/* Answer reveal */}
      <div className="result-clues">
        {puzzle.clues.map((word, i) => (
          <div key={word} className={`result-card ${won ? 'result-card--won' : 'result-card--lost'}`}
            style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="result-clue-word">{word}</span>
            <span className="result-connector">+</span>
          </div>
        ))}
        <div className={`result-answer-badge ${won ? 'result-answer-badge--won' : 'result-answer-badge--lost'}`}>
          <span className="result-answer-word">{puzzle.answer}</span>
        </div>
      </div>

      {/* Examples */}
      <div className="result-examples">
        {puzzle.clues.map((clue, i) => (
          <span key={i} className="result-example">
            {clue.toLowerCase()}<strong>{puzzle.answer.toLowerCase()}</strong>
          </span>
        ))}
      </div>

      {/* Message */}
      <div className="result-message">
        {won ? (
          <>
            <p className="result-headline result-headline--won">
              {attempts.length === 1 ? 'First try. Brilliant.' :
               attempts.length === 2 ? 'Found it.' : 'Got there.'}
            </p>
            {streak > 1 && (
              <p className="result-streak">✦ {streak} day streak</p>
            )}
          </>
        ) : (
          <p className="result-headline result-headline--lost">
            The One slipped away today.
          </p>
        )}
        <p className="result-tagline">you're the one.</p>
      </div>

      {/* Share */}
      <div className="result-actions">
        <button className="share-btn" onClick={handleShare}>
          {copied ? (
            <><span>✓</span> Copied</>
          ) : (
            <><ShareIcon /> Share Result</>
          )}
        </button>
        <p className="next-puzzle">
          Next puzzle in {hoursLeft}h {minsLeft}m
        </p>
      </div>

      {/* Attempts replay */}
      <div className="result-replay">
        {attempts.map((a, i) => (
          <span key={i} className={`replay-emoji ${a === puzzle.answer.toUpperCase() ? 'replay-emoji--win' : ''}`}>
            {a === puzzle.answer.toUpperCase() ? '🟡' : '⬛'}
          </span>
        ))}
        {won && attempts.length < MAX_ATTEMPTS && Array.from({ length: MAX_ATTEMPTS - attempts.length })
          .map((_, i) => <span key={`e${i}`} className="replay-emoji replay-emoji--empty">⬜</span>)
        }
      </div>

      {/* Brand footer */}
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
