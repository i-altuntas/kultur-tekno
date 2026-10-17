import { useState } from "react";
import { Link } from "react-router-dom";
import { login as loginApi } from "../../api/auth.js";

// Panel giriş ekranı — e-posta + parola doğrulaması.
export default function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await loginApi(email.trim(), password);
      setPassword(""); // parolayı bellekte tutma
      onSuccess(r.user);
    } catch (e2) {
      setErr(e2.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page login-page">
      <div className="grid-bg" aria-hidden />

      <div className="login-wrap">
        <div className="login-card">
          <div className="login-brand">
            <span className="brand-mark">▞</span>
            <h1>
              KÜLTÜR<span className="accent"> TEKNO</span>
            </h1>
            <span className="tag">// yönetim paneli girişi</span>
          </div>

          <p className="login-note">
            Bu alan yalnızca yetkili yöneticilere açıktır. Devam etmek için e-posta ve
            parolanızı girin.
          </p>

          <form onSubmit={submit} className="form login-form">
            <label>
              E-posta
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@site.com"
                autoComplete="username"
                required
                autoFocus
              />
            </label>

            <label>
              Parola
              <span className="pw-field">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? "Parolayı gizle" : "Parolayı göster"}
                >
                  {showPw ? "gizle" : "göster"}
                </button>
              </span>
            </label>

            {err && <div className="msg err">✗ {err}</div>}

            <button className="btn primary" disabled={busy || !email || !password}>
              {busy ? "doğrulanıyor…" : "GİRİŞ YAP ▸"}
            </button>
          </form>

          <div className="login-foot">
            <Link to="/" className="panel-link">
              [ ← SİTEYE DÖN ]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
