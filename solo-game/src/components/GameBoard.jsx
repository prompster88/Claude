import { useState, useRef, useEffect } from 'react'

export default function GameBoard({ puzzle, attempts, maxAttempts, onGuess }) {
  const [input, setInput] = useState('')
  const [shaking, setShaking] = useState(false)
  const [lastWrong, setLastWrong] = useState(false)
  const [cardState, setCardState] = useState('idle') // idle | wrong | correct
  const inputRef = useRef(null)
  const remaining = maxAttempts - attempts.length

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Detect last attempt result to animate cards
  useEffect(() => {
    if (attempts.length === 0) return
    const last = attempts[attempts.length - 1]
    const correct = last === puzzle.answer.toUpperCase()
    if (correct) {
      setCardState('correct')
    } else {
      setCardState('wrong')
      setLastWrong(true)
      setTimeout(() => {
        setCardState('idle')
        setLastWrong(false)
      }, 700)
    }
  }, [attempts])

  function handleSubmit(e) {
    e.preventDefault()
    const val = input.trim()
    if (!val) {
      triggerShake()
      return
    }
    onGuess(val)
    setInput('')
  }

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit(e)
  }

  const isLastCorrect = attempts.length > 0 &&
    attempts[attempts.length - 1] === puzzle.answer.toUpperCase()

  return (
    <div className="game-board">
      <p className="board-subtitle">
        Find the <strong>one word</strong> that connects all three
      </p>

      {/* Clue Cards */}
      <div className={`clue-row ${cardState}`}>
        {puzzle.clues.map((word, i) => (
          <div
            key={word}
            className={`clue-card clue-card--${i}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="clue-word">{word}</span>
          </div>
        ))}
      </div>

      {/* Attempts history */}
      {attempts.length > 0 && (
        <div className="attempts-history">
          {attempts.map((a, i) => {
            const isCorrect = a === puzzle.answer.toUpperCase()
            return (
              <span key={i} className={`attempt-pill ${isCorrect ? 'attempt-pill--correct' : 'attempt-pill--wrong'}`}>
                {a}
              </span>
            )
          })}
        </div>
      )}

      {/* Input */}
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
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="TYPE YOUR ANSWER"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              maxLength={20}
            />
            <button
              type="submit"
              className={`submit-btn ${input.trim() ? 'submit-btn--active' : ''}`}
              aria-label="Submit"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
        <p className="no-more-hint">revealing answer...</p>
      )}
    </div>
  )
}
