export default function Header({ onHelp }) {
  return (
    <header className="header">
      <button className="header-help" onClick={onHelp} aria-label="How to play">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 13v-1M9 10c0-1.5 2-1.5 2-3a2 2 0 00-4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="logo-wrap">
        <span className="logo-text">SOLO</span>
        <span className="logo-dot" />
      </div>

      <div style={{ width: 36 }} />
    </header>
  )
}
