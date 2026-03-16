import { useEffect, useRef, useState } from 'react'

const MAX_ATTEMPTS = 3

function getRating(attempts, won) {
  if (!won) return { label: 'בפעם הבאה', emoji: '💭', key: 'lost', sub: 'הפאזל ניצח הפעם' }
  if (attempts.length === 1) return { label: 'גאון', emoji: '⚡', key: 'genius', sub: 'ניסיון ראשון — מדהים' }
  if (attempts.length === 2) return { label: 'חד', emoji: '🔥', key: 'sharp', sub: 'ניסיון שני — כל הכבוד' }
  return { label: 'הגעת', emoji: '✓', key: 'got-it', sub: 'ניסיון שלישי — בדיוק בזמן' }
}

function getTimeLeft() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const ms = tomorrow - now
  return {
    h: String(Math.floor(ms / 3600000)).padStart(2, '0'),
    m: String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0'),
    s: String(Math.floor((ms % 60000) / 1000)).padStart(2, '0'),
  }
}

function getShareText(puzzle, attempts, won, streak, rating) {
  const grid = attempts.map(a => a === puzzle.answer ? '🟡' : '⬛').join('')
  const empty = won && attempts.length < MAX_ATTEMPTS
    ? Array(MAX_ATTEMPTS - attempts.length).fill('⬜').join('')
    : ''
  const tries = won ? attempts.length : 'X'
  const streakLine = streak > 1 ? `🔥 ${streak} ימים ברצף\n` : ''
  const ratingLine = won ? `${rating.emoji} ${rating.label} · ` : ''
  return `SOLO #${puzzle.id}\n${ratingLine}${tries}/${MAX_ATTEMPTS}\n\n${grid}${empty}\n${streakLine}\nsolo.co.il`
}

function spawnParticles(container) {
  const colors = ['#C9A050', '#DDB96A', '#F0D090', '#FFFFFF', '#FFE8A0', '#FFF5CC']

  function burst(count, yBase, delayOffset) {
    setTimeout(() => {
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div')
        const isStar = Math.random() > 0.55

        if (isStar) {
          p.className = 'particle particle--star'
          p.textContent = ['✦', '✧', '·', '★', '✶'][Math.floor(Math.random() * 5)]
          p.style.cssText = `
            left: ${5 + Math.random() * 90}%;
            top: ${yBase + Math.random() * 25}%;
            font-size: ${7 + Math.random() * 16}px;
            color: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-delay: ${Math.random() * 0.5}s;
            animation-duration: ${1.8 + Math.random() * 1.8}s;
            --drift: ${(Math.random() - 0.5) * 240}px;
            --rise: ${180 + Math.random() * 260}px;
          `
        } else {
          p.className = 'particle'
          const size = 2 + Math.random() * 7
          p.style.cssText = `
            left: ${5 + Math.random() * 90}%;
            top: ${yBase + Math.random() * 25}%;
            animation-delay: ${Math.random() * 0.7}s;
            animation-duration: ${1.5 + Math.random() * 2}s;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            width: ${size}px;
            height: ${size}px;
            border-radius: ${Math.random() > 0.4 ? '50%' : '2px'};
            --drift: ${(Math.random() - 0.5) * 240}px;
            --rise: ${150 + Math.random() * 220}px;
          `
        }
        container.appendChild(p)
        setTimeout(() => p.remove(), 5000)
      }
    }, delayOffset)
  }

  burst(55, 30, 0)
  burst(40, 25, 600)
  burst(30, 35, 1300)
}

export default function ResultScreen({ puzzle, attempts, won, streak }) {
  const particleRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())

  const rating = getRating(attempts, won)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (won && particleRef.current) {
      setTimeout(() => spawnParticles(particleRef.current), 250)
    }
  }, [won])

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  function handleShare() {
    const text = getShareText(puzzle, attempts, won, streak, rating)
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
    <div className={`result-screen ${visible ? 'result-screen--visible' : ''}`}>
      <div ref={particleRef} className="particle-container" aria-hidden="true" />

      {/* ① Rating badge — most prominent */}
      <div className={`rating-badge rating-badge--${rating.key}`}>
        <span className="rating-emoji">{rating.emoji}</span>
        <span className="rating-label">{rating.label}</span>
        <span className="rating-sublabel">{rating.sub}</span>
      </div>

      {/* ② Answer reveal */}
      <div className="result-clues">
        {puzzle.clues.map((word, i) => (
          <div
            key={word}
            className={`result-card ${won ? 'result-card--won' : 'result-card--lost'}`}
            style={{ animationDelay: `${0.15 + i * 0.1}s` }}
          >
            <span className="result-clue-word">{word}</span>
            <span className="result-connector">+</span>
          </div>
        ))}
        <div className={`result-answer-badge ${won ? 'result-answer-badge--won' : 'result-answer-badge--lost'}`}>
          <span className="result-answer-word">{puzzle.answer}</span>
        </div>
      </div>

      {/* ③ Examples */}
      <div className="result-examples">
        {puzzle.clues.map((clue, i) => (
          <span key={i} className="result-example">
            <strong>{puzzle.answer}</strong>{clue}
          </span>
        ))}
      </div>

      {/* ④ Emoji grid */}
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

      {/* ⑤ Streak */}
      {streak > 1 && (
        <p className="result-streak">🔥 {streak} ימים ברצף</p>
      )}

      {/* ⑥ Actions */}
      <div className="result-actions">
        <button className={`share-btn ${won ? 'share-btn--won' : ''}`} onClick={handleShare}>
          {copied ? (
            <><span>✓</span> הועתק! הזמן חבר</>
          ) : (
            <><ShareIcon /> שתף תוצאה</>
          )}
        </button>

        <div className="countdown-wrap">
          <p className="countdown-label">הפאזל הבא</p>
          <p className="countdown-time">
            <span>{timeLeft.h}</span>:{timeLeft.m}:{timeLeft.s}
          </p>
        </div>
      </div>

      {/* ⑦ Tagline + footer */}
      <footer className="result-footer">
        <span className="result-logo">SOLO</span>
        <span className="result-footer-sep">·</span>
        <span className="result-tagline">you're the one.</span>
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
