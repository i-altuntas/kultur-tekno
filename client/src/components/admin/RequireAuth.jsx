import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe, onUnauthorized as subscribeUnauthorized } from "../../api/auth.js";
import Login from "./Login.jsx";

// Panel kapısı (istemci tarafı).
//
// ÖNEMLİ: Buradaki kontrol yalnızca ARAYÜZ içindir — gerçek güvenlik sunucudaki
// oturum denetimidir (server/lib/guard.js). İstemci kodu her zaman atlatılabilir;
// bu yüzden panel verisi için sunucu da 401 döndürür. Burası sadece yetkisiz
// kullanıcıya boş/bozuk panel yerine düzgün bir giriş ekranı göstermek için var.

const AuthCtx = createContext(null);

export function useAuth() {
  return useContext(AuthCtx);
}

export default function RequireAuth({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking"); // checking | anon | ready

  const check = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
      setStatus(u ? "ready" : "anon");
    } catch {
      setUser(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Oturum sunucuda düşerse (süre doldu / iptal edildi) arayüzü giriş ekranına al
  const onUnauthorized = useCallback(() => {
    setUser(null);
    setStatus("anon");
  }, []);

  // Herhangi bir panel isteği 401 alırsa anında giriş ekranına dön
  useEffect(() => subscribeUnauthorized(onUnauthorized), [onUnauthorized]);

  if (status === "checking") {
    return (
      <div className="page">
        <div className="grid-bg" aria-hidden />
        <div className="read-info">
          <p>// oturum doğrulanıyor…</p>
        </div>
      </div>
    );
  }

  if (status === "anon") {
    return (
      <Login
        onSuccess={(u) => {
          setUser(u);
          setStatus("ready");
        }}
      />
    );
  }

  return (
    <AuthCtx.Provider value={{ user, onUnauthorized, refresh: check }}>
      {children}
    </AuthCtx.Provider>
  );
}
