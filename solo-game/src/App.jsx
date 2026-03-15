import { useState, useEffect } from 'react'
import { getTodaysPuzzle, getTodayKey } from './data/puzzles'
import Header from './components/Header'
import GameBoard from './components/GameBoard'
import ResultScreen from './components/ResultScreen'
import HowToPlay from './components/HowToPlay'

const MAX_ATTEMPTS = 3

function loadState() {
  try {
    const key = getTodayKey()
    const raw = localStorage.getItem(`solo_${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    const key = getTodayKey()
    localStorage.setItem(`solo_${key}`, JSON.stringify(state))
  } catch {}
}

function loadStreak() {
  try {
    return parseInt(localStorage.getItem('solo_streak') || '0', 10)
  } catch {
    return 0
  }
}

function updateStreak(won) {
  try {
    const lastWinDate = localStorage.getItem('solo_last_win')
    const today = getTodayKey()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = yesterday.toISOString().slice(0, 10)

    if (!won) {
      localStorage.setItem('solo_streak', '0')
      return 0
    }

    if (lastWinDate === today) {
      return loadStreak()
    }

    let streak = loadStreak()
    if (lastWinDate === yKey) {
      streak += 1
    } else {
      streak = 1
    }
    localStorage.setItem('solo_streak', String(streak))
    localStorage.setItem('solo_last_win', today)
    return streak
  } catch {
    return 0
  }
}

export default function App() {
  const puzzle = getTodaysPuzzle()
  const [phase, setPhase] = useState('loading') // loading | tutorial | playing | won | lost
  const [attempts, setAttempts] = useState([]) // array of guessed strings
  const [streak, setStreak] = useState(loadStreak())
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setAttempts(saved.attempts || [])
      if (saved.result === 'won') setPhase('won')
      else if (saved.result === 'lost') setPhase('lost')
      else setPhase('playing')
    } else {
      const hasPlayed = localStorage.getItem('solo_has_played')
      if (!hasPlayed) {
        setPhase('tutorial')
      } else {
        setPhase('playing')
      }
    }
    setStreak(loadStreak())
  }, [])

  function handleGuess(guess) {
    const normalizedGuess = guess.trim()
    const normalizedAnswer = puzzle.answer
    const isCorrect = normalizedGuess === normalizedAnswer

    const newAttempts = [...attempts, normalizedGuess]
    setAttempts(newAttempts)

    if (isCorrect) {
      const newStreak = updateStreak(true)
      setStreak(newStreak)
      saveState({ attempts: newAttempts, result: 'won' })
      setTimeout(() => setPhase('won'), 600)
    } else if (newAttempts.length >= MAX_ATTEMPTS) {
      updateStreak(false)
      saveState({ attempts: newAttempts, result: 'lost' })
      setTimeout(() => setPhase('lost'), 600)
    } else {
      saveState({ attempts: newAttempts, result: 'playing' })
    }
  }

  function handleTutorialClose() {
    localStorage.setItem('solo_has_played', '1')
    setPhase('playing')
    setShowTutorial(false)
  }

  if (phase === 'loading') return null

  return (
    <div className="app">
      <div className="app-inner">
        <Header
          puzzleId={puzzle.id}
          streak={streak}
          onHelp={() => setShowTutorial(true)}
        />

        {(phase === 'playing') && (
          <GameBoard
            puzzle={puzzle}
            attempts={attempts}
            maxAttempts={MAX_ATTEMPTS}
            onGuess={handleGuess}
          />
        )}

        {(phase === 'won' || phase === 'lost') && (
          <ResultScreen
            puzzle={puzzle}
            attempts={attempts}
            won={phase === 'won'}
            streak={streak}
          />
        )}

        {(phase === 'tutorial' || showTutorial) && (
          <HowToPlay onClose={handleTutorialClose} />
        )}
      </div>
    </div>
  )
}
