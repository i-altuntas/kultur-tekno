import { NavLink } from "react-router-dom";

// Her sayfada görünen üst navigasyon. Sol üstte ana sayfa (ev) ikonu.
const cls = ({ isActive }) => "topnav-btn" + (isActive ? " active" : "");

export default function TopNav() {
  return (
    <nav className="topnav">
      <NavLink to="/" end className="topnav-home" title="Ana sayfa" aria-label="Ana sayfa">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M3 11.2 12 4l9 7.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 10v9.2h13V10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 19.2v-5h4v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </NavLink>

      <div className="topnav-links">
        <NavLink to="/" end className={cls}>
          <span className="ic">📰</span>
          <span className="lbl">Haberler</span>
        </NavLink>
        <NavLink to="/kose-yazilari" className={cls}>
          <span className="ic">✍️</span>
          <span className="lbl">Köşe Yazıları</span>
        </NavLink>
        <NavLink to="/egitici-yazilar" className={cls}>
          <span className="ic">🎓</span>
          <span className="lbl">Eğitici Yazılar</span>
        </NavLink>
        <NavLink to="/arduino-projeleri" className={cls}>
          <span className="ic">⚡</span>
          <span className="lbl">Arduino</span>
        </NavLink>
        <NavLink to="/planlar" className={cls}>
          <span className="ic">📋</span>
          <span className="lbl">Planlar</span>
        </NavLink>
        <NavLink to="/kurs-kitaplari" className={cls}>
          <span className="ic">📚</span>
          <span className="lbl">Kurs Kitapları</span>
        </NavLink>
      </div>

      <NavLink to="/panel" className="topnav-panel" title="Yönetim paneli">
        PANEL
      </NavLink>
    </nav>
  );
}
