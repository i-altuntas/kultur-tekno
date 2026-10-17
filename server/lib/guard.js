import { logAudit, requireAuth } from "./auth.js";

// ─────────────────────────────────────────────────────────────────────────────
// VARSAYILAN: KAPALI (deny-by-default) + CSRF KORUMASI
//
// 1) Açık listede (PUBLIC_GETS) olmayan her uç oturum ister.
// 2) Durum değiştiren her istekte (POST/PATCH/PUT/DELETE) "X-KT-CSRF: 1"
//    özel başlığı zorunludur; tarayıcı tabanlı çapraz site form (CSRF)
//    saldırıları bu başlığı gönderemeyeceği için 403 ile reddedilir.
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_GETS = [
  /^\/api\/health$/,
  /^\/api\/categories$/,
  /^\/api\/news$/,
  /^\/api\/news\/\d+$/,
  /^\/api\/kose_yazilari$/,
  /^\/api\/kose_yazilari\/\d+$/,
  /^\/api\/egitici_yazilar$/,
  /^\/api\/egitici_yazilar\/\d+$/,
  /^\/api\/egitici_yazilar\/\d+\/sayfalar$/,
  /^\/api\/arduino_projeleri$/,
  /^\/api\/arduino_projeleri\/\d+$/,
  /^\/api\/planlar$/,
  /^\/api\/planlar\/\d+\/tablo$/,
  /^\/api\/kurs_kitaplari$/,
  /^\/api\/kurs_kitaplari\/\d+$/,
  /^\/api\/kurs_kitaplari\/\d+\/bolumler$/,
];

const PUBLIC_POSTS = [/^\/api\/auth\/login$/, /^\/api\/auth\/logout$/];

const STATE_CHANGING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function apiGuard(req, res, next) {
  if (!req.path.startsWith("/api")) return next();

  const method = req.method.toUpperCase();
  const p = req.path;

  // Durum değiştiren tüm isteklerde CSRF başlığı zorunlu
  if (STATE_CHANGING.has(method) && req.headers["x-kt-csrf"] !== "1") {
    return res.status(403).json({
      error: "Güvenlik doğrulaması reddedildi (eksik CSRF başlığı)",
    });
  }

  if ((method === "GET" || method === "HEAD") && PUBLIC_GETS.some((re) => re.test(p))) {
    const wantsAll = req.query.all === "1" || req.query.all === "true";
    if (wantsAll) return requireAuth(req, res, next);
    return next();
  }

  if (method === "POST" && PUBLIC_POSTS.some((re) => re.test(p))) {
    return next();
  }

  return requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (STATE_CHANGING.has(method) && req.user) {
      logAudit(req, `API_${method}`, {
        userId: req.user.id,
        email: req.user.email,
        detail: `${method} ${p}`,
      });
    }
    next();
  });
}
