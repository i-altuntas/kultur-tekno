import { notifyUnauthorized } from "./auth.js";

// Tüm API çağrıları için tek giriş noktası.
// 1) Oturum çerezini her isteğe iliştirir (credentials).
// 2) Durum değiştiren isteklerde (POST/PATCH/PUT/DELETE) CSRF koruma başlığını
//    ("X-KT-CSRF": "1") otomatik ekler.
// 3) Sunucu 401 dönerse arayüzü uyarır ve giriş ekranına yönlendirir.
export async function apiFetch(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (method !== "GET" && method !== "HEAD") {
    headers["X-KT-CSRF"] = "1";
  }

  const res = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers,
  });

  if (res.status === 401) {
    notifyUnauthorized();
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Oturum sona erdi — yeniden giriş yapın");
  }
  return res;
}

export async function apiJson(url, options, fallbackError = "İstek başarısız") {
  const res = await apiFetch(url, options);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || fallbackError);
  return j;
}

export function apiSend(url, method, body, fallbackError) {
  return apiJson(
    url,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-KT-CSRF": "1",
      },
      body: JSON.stringify(body),
    },
    fallbackError
  );
}
