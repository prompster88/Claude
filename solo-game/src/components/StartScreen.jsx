export default function StartScreen({ highScore, onPlay, onHelp }) {
  return (
    <div className="start-screen">
      {/* Logo */}
      <div className="start-logo">
        <span className="start-logo-text">SOLO</span>
        <span className="start-logo-dot" />
      </div>

      <p className="start-tagline">מצא את המילה שמחברת הכל</p>

      {/* High score */}
      {highScore > 0 && (
        <div className="start-hs">
          <span className="start-hs-label">שיאך</span>
          <span className="start-hs-num">{highScore.toLocaleString('he-IL')}</span>
        </div>
      )}

      {/* Lives preview */}
      <div className="start-lives-preview">
        <span className="start-lives-hearts">❤️❤️❤️</span>
        <span className="start-lives-label">3 חיים · 68 פאזלים · ניקוד רצף</span>
      </div>

      {/* CTA */}
      <button className="start-play-btn" onClick={onPlay}>
        שחק
      </button>

      <button className="start-help-btn" onClick={onHelp}>
        ? איך משחקים
      </button>

      <p className="start-brand">you're the one.</p>
    </div>
  )
}
