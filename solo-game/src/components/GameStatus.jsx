function getMultiplier(streak) {
  if (streak >= 10) return 3
  if (streak >= 5) return 2
  if (streak >= 3) return 1.5
  return 1
}

export default function GameStatus({ score, lives, maxLives, streak }) {
  const mult = getMultiplier(streak)

  return (
    <div className="game-status">
      {/* Lives */}
      <div className="gs-lives">
        {Array.from({ length: maxLives }).map((_, i) => (
          <span
            key={i}
            className={`gs-heart ${i < lives ? 'gs-heart--full' : 'gs-heart--empty'}`}
            aria-label={i < lives ? 'חיים' : 'חיים אבודים'}
          />
        ))}
      </div>

      {/* Score */}
      <div className="gs-score">
        <span className="gs-score-num">{score.toLocaleString('he-IL')}</span>
        <span className="gs-score-label">נקודות</span>
      </div>

      {/* Streak multiplier */}
      <div className={`gs-multiplier ${mult > 1 ? 'gs-multiplier--active' : ''}`}>
        {mult > 1 ? (
          <>
            <span className="gs-mult-fire">🔥</span>
            <span className="gs-mult-num">×{mult}</span>
          </>
        ) : (
          <span className="gs-streak-idle">
            {streak > 0 ? `${streak} ✓` : '—'}
          </span>
        )}
      </div>
    </div>
  )
}
