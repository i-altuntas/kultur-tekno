import express from "express";
import rateLimit from "express-rate-limit";
import {
  attemptLogin,
  changeCredentials,
  changePassword,
  createSession,
  destroyAllSessions,
  destroySession,
  getSecurityOverview,
  logAudit,
  requireAuth,
} from "../lib/auth.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Çok fazla giriş denemesi — 15 dakika sonra tekrar deneyin" },
});

const authBodyParser = express.json({ limit: "16kb" });

export default function authRoutes(app) {
  // Giriş: e-posta + parola → httpOnly oturum çerezi
  app.post("/api/auth/login", loginLimiter, authBodyParser, async (req, res) => {
    try {
      if (req.headers["x-kt-csrf"] !== "1") {
        return res.status(403).json({ error: "Güvenlik doğrulaması reddedildi (CSRF)" });
      }
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "E-posta ve parola zorunludur" });
      }
      const r = await attemptLogin(email, password, req);
      if (!r.ok) return res.status(r.status).json({ error: r.error });

      await createSession(res, r.user, req);
      res.json({ ok: true, user: r.user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Giriş yapılamadı" });
    }
  });

  // Çıkış: oturumu sunucudan siler
  app.post("/api/auth/logout", authBodyParser, async (req, res) => {
    try {
      await logAudit(req, "LOGOUT");
      await destroySession(req, res);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Çıkış yapılamadı" });
    }
  });

  // Oturum kontrolü
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  // Parola değiştirme (geriye dönük uyumluluk)
  app.post("/api/auth/change-password", requireAuth, authBodyParser, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      const r = await changePassword(req.user.id, currentPassword, newPassword, req);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      await destroySession(req, res);
      res.json({ ok: true, message: "Parola değişti — lütfen yeniden giriş yapın" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Parola değiştirilemedi" });
    }
  });

  // E-posta ve/veya Parola değiştirme — başarıdan sonra tüm oturumlar düşürülür
  app.post("/api/auth/change-credentials", requireAuth, authBodyParser, async (req, res) => {
    try {
      const { currentPassword, newPassword, newEmail } = req.body || {};
      const r = await changeCredentials(
        req.user.id,
        currentPassword,
        { newPassword, newEmail },
        req
      );
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      await destroySession(req, res);
      res.json({
        ok: true,
        email: r.email,
        message: "Hesap bilgileriniz güncellendi — lütfen yeniden giriş yapın",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Hesap bilgileri güncellenemedi" });
    }
  });

  // Güvenlik özeti: aktif oturumlar ve son güvenlik denetim kayıtları
  app.get("/api/auth/security", requireAuth, async (req, res) => {
    try {
      const data = await getSecurityOverview(req.user.id, req.user.sessionId);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Güvenlik kayıtları alınamadı" });
    }
  });

  // Diğer tüm cihazlardaki oturumları sonlandır
  app.post("/api/auth/logout-all", requireAuth, authBodyParser, async (req, res) => {
    try {
      await destroyAllSessions(req.user.id, req.user.sessionId);
      await logAudit(req, "REVOKE_OTHER_SESSIONS", {
        userId: req.user.id,
        email: req.user.email,
        detail: "Diğer cihazlardaki tüm oturumlar kapatıldı",
      });
      res.json({ ok: true, message: "Diğer tüm cihazlardaki oturumlar sonlandırıldı" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Oturumlar sonlandırılamadı" });
    }
  });
}
