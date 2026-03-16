import { useEffect, useState } from 'react'

export default function BetweenScreen({ data, onContinue }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30)
    // Auto-advance after 2 seconds
    const t2 = setTimeout(() => onContinue(), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const { won, points, multiplier, streak, newScore, lives, answer, clues } = data

  return (
    <div
      className={`between-screen ${visible ? 'between-screen--visible' : ''}`}
      onClick={onContinue}
      role="button"
      tabIndex={0}
      aria-label="המשך"
    >
      {won ? (
        <>
          <div className="between-result between-result--won">
            <span className="between-icon">✓</span>
            <div className="between-points">
              +{points}
              {multiplier > 1 && <span className="between-mult"> ×{multiplier}</span>}
            </div>
          </div>

          {streak >= 3 && (
            <div className="between-streak">
              🔥 {streak} ברצף!
            </div>
          )}

          <div className="between-answer">
            <span className="between-answer-word">{answer}</span>
            <div className="between-compounds">
              {clues.map((c, i) => (
                <span key={i} className="between-compound">
                  <strong>{answer}</strong>{c}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="between-result between-result--lost">
            <span className="between-icon between-icon--lost">✗</span>
            <div className="between-lost-label">לא הפעם</div>
          </div>

          <div className="between-answer">
            <span className="between-answer-label">התשובה הייתה</span>
            <span className="between-answer-word between-answer-word--lost">{answer}</span>
          </div>

          <div className="between-lives">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < lives ? 'between-heart--full' : 'between-heart--empty'}>
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="between-tap-hint">הקש להמשיך</p>
    </div>
  )
}
