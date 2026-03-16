import { useEffect, useRef, useState } from 'react'

function spawnParticles(container) {
  if (!container) return
  const colors = ['#C9A050', '#DDB96A', '#F0D090', '#FFFFFF']
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div')
    const isStar = Math.random() > 0.5
    if (isStar) {
      p.className = 'particle particle--star'
      p.textContent = ['✦', '✧', '★', '·'][Math.floor(Math.random() * 4)]
      p.style.cssText = `
        left: ${10 + Math.random() * 80}%;
        top: ${40 + Math.random() * 20}%;
        font-size: ${8 + Math.random() * 14}px;
        color: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${1.8 + Math.random() * 1.5}s;
        --drift: ${(Math.random() - 0.5) * 200}px;
        --rise: ${180 + Math.random() * 220}px;
      `
    } else {
      const size = 3 + Math.random() * 6
      p.className = 'particle'
      p.style.cssText = `
        left: ${10 + Math.random() * 80}%;
        top: ${40 + Math.random() * 20}%;
        width: ${size}px; height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.4 ? '50%' : '2px'};
        animation-delay: ${Math.random() * 0.6}s;
        animation-duration: ${1.5 + Math.random() * 2}s;
        --drift: ${(Math.random() - 0.5) * 200}px;
        --rise: ${150 + Math.random() * 200}px;
      `
    }
    container.appendChild(p)
    setTimeout(() => p.remove(), 4500)
  }
}

function getShareText(score, maxStreak, solved) {
  const streakLine = maxStreak > 1 ? `🔥 רצף מקסימלי: ${maxStreak}\n` : ''
  return `SOLO 🎯\n\nניקוד: ${score.toLocaleString('he-IL')} נקודות\n${streakLine}פתרתי ${solved} פאזלים\n\nsolo.co.il — כמה תצליח?`
}

export default function GameOverScreen({ score, highScore, maxStreak, solved, isNewHighScore, onPlayAgain }) {
  const particleRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isNewHighScore && particleRef.current) {
      setTimeout(() => spawnParticles(particleRef.current), 400)
    }
  }, [isNewHighScore])

  function handleShare() {
    const text = getShareText(score, maxStreak, solved)
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    }
  }

  return (
    <div className={`gameover-screen ${visible ? 'gameover-screen--visible' : ''}`}>
      <div ref={particleRef} className="particle-container" aria-hidden="true" />

      {/* Game over header */}
      <div className="go-header">
        <span className="go-skull">💀</span>
        <h1 className="go-title">GAME OVER</h1>
      </div>

      {/* Score */}
      <div className={`go-score-block ${isNewHighScore ? 'go-score-block--new' : ''}`}>
        {isNewHighScore && (
          <div className="go-new-hs">🏆 שיא חדש!</div>
        )}
        <div className="go-score-num">{score.toLocaleString('he-IL')}</div>
        <div className="go-score-label">נקודות</div>
        {!isNewHighScore && highScore > 0 && (
          <div className="go-prev-hs">שיאך: {highScore.toLocaleString('he-IL')}</div>
        )}
      </div>

      {/* Stats */}
      <div className="go-stats">
        <div className="go-stat">
          <span className="go-stat-num">{solved}</span>
          <span className="go-stat-label">פאזלים</span>
        </div>
        <div className="go-stat-divider" />
        <div className="go-stat">
          <span className="go-stat-num">{maxStreak}</span>
          <span className="go-stat-label">רצף מקסימלי</span>
        </div>
        <div className="go-stat-divider" />
        <div className="go-stat">
          <span className="go-stat-num">{solved > 0 ? Math.round(score / solved) : 0}</span>
          <span className="go-stat-label">ממוצע לפאזל</span>
        </div>
      </div>

      {/* Actions */}
      <div className="go-actions">
        <button className="go-play-again" onClick={onPlayAgain}>
          שחק שוב
        </button>
        <button className="go-share" onClick={handleShare}>
          {copied ? '✓ הועתק!' : <><ShareIcon /> שתף ניקוד</>}
        </button>
      </div>

      <footer className="go-footer">
        <span className="go-logo">SOLO</span>
        <span className="go-sep">·</span>
        <span className="go-tagline">you're the one.</span>
      </footer>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1v-3M10 2h4v4M14 2L7 9"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
