import { useState, useCallback } from 'react'
import { shufflePuzzles } from './data/puzzles'
import Header from './components/Header'
import GameStatus from './components/GameStatus'
import GameBoard from './components/GameBoard'
import StartScreen from './components/StartScreen'
import BetweenScreen from './components/BetweenScreen'
import GameOverScreen from './components/GameOverScreen'
import HowToPlay from './components/HowToPlay'

const MAX_LIVES = 3
const MAX_ATTEMPTS = 3

function getPoints(attemptCount) {
  if (attemptCount === 1) return 300
  if (attemptCount === 2) return 150
  return 75
}

function getMultiplier(streak) {
  if (streak >= 10) return 3
  if (streak >= 5) return 2
  if (streak >= 3) return 1.5
  return 1
}

function loadHighScore() {
  try { return parseInt(localStorage.getItem('solo_hs') || '0', 10) } catch { return 0 }
}

function saveHighScore(score) {
  try { localStorage.setItem('solo_hs', String(score)) } catch {}
}

export default function App() {
  const [phase, setPhase] = useState('start') // start | playing | between | gameover
  const [puzzleQueue, setPuzzleQueue] = useState([])
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [attempts, setAttempts] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [solved, setSolved] = useState(0)
  const [highScore, setHighScore] = useState(loadHighScore)
  const [betweenData, setBetweenData] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [isNewHighScore, setIsNewHighScore] = useState(false)

  function startGame() {
    const queue = shufflePuzzles()
    setPuzzleQueue(queue)
    setPuzzleIndex(0)
    setAttempts([])
    setScore(0)
    setLives(MAX_LIVES)
    setStreak(0)
    setMaxStreak(0)
    setSolved(0)
    setIsNewHighScore(false)
    setPhase('playing')
  }

  const currentPuzzle = puzzleQueue[puzzleIndex]

  const handleGuess = useCallback((guess) => {
    const isCorrect = guess.trim() === currentPuzzle.answer
    const newAttempts = [...attempts, guess.trim()]
    setAttempts(newAttempts)

    if (isCorrect) {
      const newStreak = streak + 1
      const mult = getMultiplier(newStreak)
      const pts = Math.round(getPoints(newAttempts.length) * mult)
      const newScore = score + pts
      const newMax = Math.max(maxStreak, newStreak)

      setStreak(newStreak)
      setMaxStreak(newMax)
      setScore(newScore)
      setSolved(s => s + 1)

      setBetweenData({
        won: true,
        points: pts,
        multiplier: mult,
        streak: newStreak,
        newScore,
        lives,
        answer: currentPuzzle.answer,
        clues: currentPuzzle.clues,
      })
      setTimeout(() => setPhase('between'), 650)

    } else if (newAttempts.length >= MAX_ATTEMPTS) {
      const newLives = lives - 1
      setLives(newLives)
      setStreak(0)

      if (newLives <= 0) {
        // Game over
        const isNew = score > highScore
        if (isNew) {
          saveHighScore(score)
          setHighScore(score)
          setIsNewHighScore(true)
        }
        setTimeout(() => setPhase('gameover'), 1200)
      } else {
        setBetweenData({
          won: false,
          points: 0,
          multiplier: 1,
          streak: 0,
          newScore: score,
          lives: newLives,
          answer: currentPuzzle.answer,
          clues: currentPuzzle.clues,
        })
        setTimeout(() => setPhase('between'), 700)
      }
    }
  }, [attempts, currentPuzzle, streak, score, maxStreak, lives, highScore])

  function handleBetweenContinue() {
    const nextIndex = (puzzleIndex + 1) % puzzleQueue.length
    // If we've gone through all puzzles, reshuffle
    if (nextIndex === 0) {
      setPuzzleQueue(shufflePuzzles())
    }
    setPuzzleIndex(nextIndex)
    setAttempts([])
    setPhase('playing')
  }

  const isPlaying = phase === 'playing' || phase === 'between'

  return (
    <div className="app">
      <div className="app-inner">

        {isPlaying && (
          <Header onHelp={() => setShowTutorial(true)} />
        )}

        {isPlaying && (
          <GameStatus
            score={score}
            lives={lives}
            maxLives={MAX_LIVES}
            streak={streak}
          />
        )}

        {phase === 'start' && (
          <StartScreen
            highScore={highScore}
            onPlay={startGame}
            onHelp={() => setShowTutorial(true)}
          />
        )}

        {phase === 'playing' && currentPuzzle && (
          <GameBoard
            puzzle={currentPuzzle}
            attempts={attempts}
            maxAttempts={MAX_ATTEMPTS}
            onGuess={handleGuess}
          />
        )}

        {phase === 'between' && betweenData && (
          <BetweenScreen
            data={betweenData}
            onContinue={handleBetweenContinue}
          />
        )}

        {phase === 'gameover' && (
          <GameOverScreen
            score={score}
            highScore={highScore}
            maxStreak={maxStreak}
            solved={solved}
            isNewHighScore={isNewHighScore}
            onPlayAgain={startGame}
          />
        )}

        {showTutorial && (
          <HowToPlay onClose={() => setShowTutorial(false)} />
        )}
      </div>
    </div>
  )
}
