import { useState } from "react";
import {
  changeCredentials,
  getSecurityOverview,
  logout as logoutApi,
  logoutOtherSessions,
} from "../../api/auth.js";
import { useAuth } from "./RequireAuth.jsx";

// Panel üst köşesi: kim giriş yapmış, e-posta/parola değiştirme, güvenlik kayıtları ve çıkış.
export default function AccountBar() {
  const auth = useAuth();
  const [panel, setPanel] = useState(null); // null | "cred" | "sec"
  const [email, setEmail] = useState(auth.user?.email || "");
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [nw2, setNw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [sec, setSec] = useState({ sessions: [], logs: [] });

  async function doLogout() {
    try {
      await logoutApi();
    } catch {
      /* çerez yine de düşsün */
    }
    auth.onUnauthorized();
  }

  async function openSecurity() {
    if (panel === "sec") {
      setPanel(null);
      return;
    }
    setPanel("sec");
    setMsg(null);
    try {
      const data = await getSecurityOverview();
      setSec(data);
    } catch (e) {
      setMsg({ type: "err", text: "✗ " + e.message });
    }
  }

  async function revokeOthers() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await logoutOtherSessions();
      const data = await getSecurityOverview();
      setSec(data);
      setMsg({ type: "ok", text: "✓ " + r.message });
    } catch (e) {
      setMsg({ type: "err", text: "✗ " + e.message });
    } finally {
      setBusy(false);
    }
  }

  async function submitCred(e) {
    e.preventDefault();
    if (nw && nw !== nw2) {
      setMsg({ type: "err", text: "✗ Yeni parolalar birbiriyle uyuşmuyor" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await changeCredentials({
        currentPassword: cur,
        newEmail: email.trim(),
        newPassword: nw || undefined,
      });
      setCur("");
      setNw("");
      setNw2("");
      setMsg({ type: "ok", text: "✓ Hesap bilgileri güncellendi — yeniden giriş yapın" });
      setTimeout(() => auth.onUnauthorized(), 1500);
    } catch (e2) {
      setMsg({ type: "err", text: "✗ " + e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-bar">
      <span className="account-who" title={auth.user?.email}>
        ● {auth.user?.email}
      </span>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setMsg(null);
          setEmail(auth.user?.email || "");
          setPanel((p) => (p === "cred" ? null : "cred"));
        }}
      >
        hesap / parola
      </button>
      <button type="button" className="btn" onClick={openSecurity}>
        güvenlik ({sec.sessions?.length || 1})
      </button>
      <button type="button" className="btn" onClick={doLogout}>
        çıkış yap ⏏
      </button>

      {panel === "cred" && (
        <form onSubmit={submitCred} className="form pw-change">
          <span className="pw-change-title">▸ E-POSTA / PAROLA GÜNCELLE</span>
          <input
            type="email"
            placeholder="Yönetici e-posta adresi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Mevcut parola (zorunlu)"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            autoComplete="current-password"
            required
          />
          <input
            type="password"
            placeholder="Yeni parola (değiştirmek istemiyorsanız boş bırakın)"
            value={nw}
            onChange={(e) => setNw(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Yeni parola (tekrar)"
            value={nw2}
            onChange={(e) => setNw2(e.target.value)}
            autoComplete="new-password"
          />
          <small className="hint">
            Parola en az 10 karakter; büyük harf, küçük harf ve rakam içermeli.
          </small>
          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
          <button className="btn primary" disabled={busy}>
            {busy ? "güncelleniyor…" : "KAYDET ▸"}
          </button>
        </form>
      )}

      {panel === "sec" && (
        <div className="form pw-change">
          <span className="pw-change-title">▸ AKTİF OTURUMLAR ({sec.sessions.length})</span>
          {sec.sessions.map((s) => (
            <small key={s.id} className="hint">
              {s.current ? "● [Bu cihaz]" : "○"} IP: {s.ip || "?"} ·{" "}
              {new Date(s.created_at).toLocaleString("tr-TR")}
            </small>
          ))}
          {sec.sessions.length > 1 && (
            <button type="button" className="btn" disabled={busy} onClick={revokeOthers}>
              diğer cihazlardaki oturumları kapat
            </button>
          )}
          <span className="pw-change-title">▸ SON GÜVENLİK KAYITLARI</span>
          {sec.logs.slice(0, 6).map((l) => (
            <small key={l.id} className="hint">
              [{l.event}] {l.email || "-"} ({l.ip || "?"}) ·{" "}
              {new Date(l.created_at).toLocaleTimeString("tr-TR")}
            </small>
          ))}
          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        </div>
      )}
    </div>
  );
}
