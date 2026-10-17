// Panel kimlik doğrulama ve güvenlik API'si.
// Oturum httpOnly çerezle taşınır — token JS'te tutulmaz (localStorage KULLANILMAZ).
// Durum değiştiren her istekte "X-KT-CSRF: 1" başlığı gönderilir.

const CSRF_HEADERS = {
  "Content-Type": "application/json",
  "X-KT-CSRF": "1",
};

export async function login(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: CSRF_HEADERS,
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Giriş yapılamadı");
  return j;
}

export async function logout() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-KT-CSRF": "1" },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Çıkış yapılamadı");
  return res.json();
}

export async function getMe() {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Oturum durumu alınamadı");
  const j = await res.json();
  return j.user;
}

const unauthorizedSubs = new Set();

export function onUnauthorized(fn) {
  unauthorizedSubs.add(fn);
  return () => unauthorizedSubs.delete(fn);
}

export function notifyUnauthorized() {
  unauthorizedSubs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* abone hatası diğerlerini engellemesin */
    }
  });
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: CSRF_HEADERS,
    credentials: "same-origin",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Parola değiştirilemedi");
  return j;
}

export async function changeCredentials({ currentPassword, newPassword, newEmail }) {
  const res = await fetch("/api/auth/change-credentials", {
    method: "POST",
    headers: CSRF_HEADERS,
    credentials: "same-origin",
    body: JSON.stringify({ currentPassword, newPassword, newEmail }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Hesap bilgileri güncellenemedi");
  return j;
}

export async function getSecurityOverview() {
  const res = await fetch("/api/auth/security", { credentials: "same-origin" });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Güvenlik kayıtları alınamadı");
  return j;
}

export async function logoutOtherSessions() {
  const res = await fetch("/api/auth/logout-all", {
    method: "POST",
    headers: CSRF_HEADERS,
    credentials: "same-origin",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Oturumlar sonlandırılamadı");
  return j;
}
