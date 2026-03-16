import { useState, useRef, useEffect } from 'react'

export default function GameBoard({ puzzle, attempts, maxAttempts, onGuess }) {
  const [input, setInput] = useState('')
  const [shaking, setShaking] = useState(false)
  const [lastWrong, setLastWrong] = useState(false)
  const [cardState, setCardState] = useState('idle')
  const [flashWrong, setFlashWrong] = useState(false)
  const inputRef = useRef(null)
  const remaining = maxAttempts - attempts.length

  useEffect(() => {
    inputRef.current?.focus()
  }, [puzzle.id])

  useEffect(() => {
    if (attempts.length === 0) {
      setCardState('idle')
      return
    }
    const last = attempts[attempts.length - 1]
    const correct = last === puzzle.answer
    if (correct) {
      setCardState('correct')
    } else {
      setCardState('wrong')
      setLastWrong(true)
      setFlashWrong(true)
      setTimeout(() => { setCardState('idle'); setLastWrong(false) }, 700)
      setTimeout(() => setFlashWrong(false), 400)
    }
  }, [attempts])

  function handleSubmit(e) {
    e.preventDefault()
    const val = input.trim()
    if (!val) { triggerShake(); return }
    onGuess(val)
    setInput('')
  }

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const isLastCorrect = attempts.length > 0 &&
    attempts[attempts.length - 1] === puzzle.answer
  const tensionLevel = attempts.length

  return (
    <div className="game-board">
      <div className={`ambient-glow ambient-glow--${cardState}`} aria-hidden="true" />
      {flashWrong && <div className="screen-flash" aria-hidden="true" />}

      <p className="board-subtitle">
        מצא את <strong>המילה האחת</strong> שמחברת את השלוש
      </p>

      <div className={`clue-row ${cardState} tension-${tensionLevel}`}>
        {puzzle.clues.map((word, i) => (
          <div
            key={word}
            className={`clue-card clue-card--${i}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="clue-shine" aria-hidden="true" />
            <span className="clue-word">{word}</span>
          </div>
        ))}
      </div>

      {attempts.length > 0 && (
        <div className="attempts-history">
          {attempts.map((a, i) => (
            <span key={i} className={`attempt-pill ${a === puzzle.answer ? 'attempt-pill--correct' : 'attempt-pill--wrong'}`}>
              {a}
            </span>
          ))}
        </div>
      )}

      {!isLastCorrect && remaining > 0 && (
        <form
          className={`input-form ${shaking ? 'shake' : ''} ${lastWrong ? 'input-form--wrong' : ''}`}
          onSubmit={handleSubmit}
        >
          <div className="input-wrap">
            <input
              ref={inputRef}
              className="guess-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="הקלד את המילה המחברת..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              maxLength={20}
              dir="rtl"
            />
            <button
              type="submit"
              className={`submit-btn ${input.trim() ? 'submit-btn--active' : ''}`}
              aria-label="שלח"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="attempt-dots">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <span
                key={i}
                className={`attempt-dot ${i < attempts.length ? 'attempt-dot--used' : ''} ${i === attempts.length - 1 && lastWrong ? 'attempt-dot--just-used' : ''}`}
              />
            ))}
          </div>
        </form>
      )}

      {remaining === 0 && !isLastCorrect && (
        <p className="no-more-hint">מגלה תשובה...</p>
      )}
    </div>
  )
}
