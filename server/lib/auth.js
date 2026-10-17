import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Panel kimlik doğrulama ve güvenlik çekirdeği
//
// Güvenlik mimarisi:
// • Yönetici e-postası ve parolası kodda veya .env dosyasında TUTULMAZ;
//   yalnızca veritabanında (bcrypt cost 12 özeti olarak) saklanır.
// • Oturum JWT değil, veritabanında tutulan rastgele 256-bit opak tokendır.
//   Çerezde token'ın kendisi gider, veritabanında yalnızca SHA-256 özeti durur.
// • Her oturum oluşturulurken istemcinin User-Agent parmak izi (ua_hash)
//   oturuma bağlanır; çerez başka bir tarayıcıya/araca taşınırsa anında iptal edilir.
// • Hem kayan hareketsizlik ömrü (SESSION_HOURS) hem de mutlak oturum ömrü
//   (MAX_SESSION_HOURS) uygulanır.
// • Tüm giriş/çıkış/yetki/parola olayları admin_audit_logs tablosuna kaydedilir.
// ─────────────────────────────────────────────────────────────────────────────

export const COOKIE_NAME = "kt_panel";
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 8;
const MAX_SESSION_HOURS = Number(process.env.MAX_SESSION_HOURS) || 24;
const BCRYPT_ROUNDS = 12;
const MAX_FAILED = Number(process.env.MAX_FAILED_LOGINS) || 5;
const LOCK_MINUTES = Number(process.env.LOCK_MINUTES) || 15;
const MAX_PASSWORD_LEN = 128; // bcrypt DoS / 72-byte truncation sınırı

const isProd = () => process.env.NODE_ENV === "production";

function sha256(s) {
  return crypto.createHash("sha256").update(String(s || "")).digest("hex");
}

function uaFingerprint(req) {
  const ua = String(req.headers["user-agent"] || "").trim();
  return sha256(ua);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateEmail(email) {
  const e = normalizeEmail(email);
  if (!e || e.length > 160) return "Geçerli bir e-posta adresi girin";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "E-posta biçimi geçersiz";
  return null;
}

export function validatePassword(pw) {
  const s = String(pw || "");
  if (s.length < 10) return "Parola en az 10 karakter olmalı";
  if (s.length > MAX_PASSWORD_LEN) return `Parola en fazla ${MAX_PASSWORD_LEN} karakter olabilir`;
  if (!/[a-zçğıöşü]/.test(s)) return "Parola en az bir küçük harf içermeli";
  if (!/[A-ZÇĞIİÖŞÜ]/.test(s)) return "Parola en az bir büyük harf içermeli";
  if (!/[0-9]/.test(s)) return "Parola en az bir rakam içermeli";
  return null;
}

// ── Şema ve Denetim Kaydı (Audit Log) ───────────────────────────────────────
export async function ensureAuthSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id              SERIAL PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      name            TEXT,
      is_active       BOOLEAN NOT NULL DEFAULT true,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until    TIMESTAMPTZ,
      last_login_at   TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      ua_hash     TEXT,
      ip          TEXT,
      user_agent  TEXT,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    "ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS ua_hash TEXT"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash)"
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      email       TEXT,
      event       TEXT NOT NULL,
      ip          TEXT,
      user_agent  TEXT,
      detail      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC)"
  );
  // Süresi geçmiş veya mutlak ömrünü aşmış oturumları temizle
  await pool.query(
    `DELETE FROM admin_sessions
      WHERE expires_at < now()
         OR created_at < now() - ($1 || ' hours')::interval`,
    [String(MAX_SESSION_HOURS)]
  );
}

export async function logAudit(req, event, { userId = null, email = null, detail = null } = {}) {
  try {
    const ip = req ? String(req.ip || "").slice(0, 100) : null;
    const ua = req ? String(req.headers["user-agent"] || "").slice(0, 250) : null;
    await pool.query(
      `INSERT INTO admin_audit_logs (user_id, email, event, ip, user_agent, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, event, ip, ua, detail]
    );
  } catch (err) {
    console.error("Denetim kaydı yazılamadı:", err.message);
  }
}

// Kodda veya repo içindeki dosyalarda yönetici e-postası/parolası tutulmaz.
// Yalnızca Dokploy / konteyner ortamında ilk kurulumda ADMIN_EMAIL ve ADMIN_PASSWORD
// ortam değişkenleri dışarıdan enjekte edilmişse ve veritabanında henüz hiç yönetici
// yoksa ilk yöneticiyi bcrypt (cost 12) ile oluşturur.
export async function checkAdminExists() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM admin_users WHERE is_active = true");
  if (rows[0].n > 0) return;

  const envEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const envPw = process.env.ADMIN_PASSWORD;
  if (envEmail && envPw) {
    const emailErr = validateEmail(envEmail);
    const pwErr = validatePassword(envPw);
    if (emailErr || pwErr) {
      console.error(`✗ Panel: ADMIN_EMAIL / ADMIN_PASSWORD geçersiz (${emailErr || pwErr}).`);
      return;
    }
    const hash = await bcrypt.hash(String(envPw), BCRYPT_ROUNDS);
    await pool.query(
      "INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)",
      [envEmail, hash, process.env.ADMIN_NAME || "Yönetici"]
    );
    console.log(`✓ Panel: ilk yönetici ortam değişkeninden oluşturuldu → ${envEmail}`);
    return;
  }

  console.warn(
    "\n⚠ Panel: veritabanında aktif yönetici hesabı bulunamadı.\n" +
      "  Yönetici oluşturmak için: cd server && npm run set-admin\n" +
      "  (veya Dokploy Environment panelinde ADMIN_EMAIL ve ADMIN_PASSWORD tanımlayın)\n"
  );
}

// ── Oturum işlemleri ────────────────────────────────────────────────────────
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: maxAgeMs,
  };
}

export async function createSession(res, user, req) {
  const token = crypto.randomBytes(32).toString("hex");
  const maxAgeMs = SESSION_HOURS * 3600 * 1000;
  await pool.query(
    `INSERT INTO admin_sessions (user_id, token_hash, ua_hash, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::interval)`,
    [
      user.id,
      sha256(token),
      uaFingerprint(req),
      String(req.ip || "").slice(0, 100),
      String(req.headers["user-agent"] || "").slice(0, 300),
      String(SESSION_HOURS),
    ]
  );
  res.cookie(COOKIE_NAME, token, cookieOptions(maxAgeMs));
}

export async function destroySession(req, res) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  if (token) {
    await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [sha256(token)]);
  }
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(0), maxAge: undefined });
}

export async function destroyAllSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    await pool.query("DELETE FROM admin_sessions WHERE user_id = $1 AND id <> $2", [
      userId,
      exceptSessionId,
    ]);
  } else {
    await pool.query("DELETE FROM admin_sessions WHERE user_id = $1", [userId]);
  }
}

async function resolveSession(req) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  if (!token || typeof token !== "string" || token.length > 128) return null;

  const { rows } = await pool.query(
    `SELECT s.id AS session_id, s.ua_hash, s.expires_at, s.created_at,
            u.id, u.email, u.name, u.is_active
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND s.created_at > now() - ($2 || ' hours')::interval`,
    [sha256(token), String(MAX_SESSION_HOURS)]
  );
  if (rows.length === 0) return null;
  const s = rows[0];
  if (!s.is_active) return null;

  // User-Agent parmak izi uyuşmazlığı varsa (çerez başka tarayıcıya/araca kopyalanmışsa) oturumu düşür
  if (s.ua_hash && s.ua_hash !== uaFingerprint(req)) {
    await pool.query("DELETE FROM admin_sessions WHERE id = $1", [s.session_id]);
    await logAudit(req, "SESSION_UA_MISMATCH", {
      userId: s.id,
      email: s.email,
      detail: "User-Agent uyuşmazlığı nedeniyle oturum iptal edildi",
    });
    return null;
  }

  return s;
}

// ── Middleware ──────────────────────────────────────────────────────────────

export async function softAuth(req, _res, next) {
  try {
    const s = await resolveSession(req);
    if (s) req.user = { id: s.id, email: s.email, name: s.name, sessionId: s.session_id };
  } catch (err) {
    console.error("softAuth hatası:", err);
  }
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const s = await resolveSession(req);
    if (!s) return res.status(401).json({ error: "Yetkisiz — panele giriş yapın" });
    req.user = { id: s.id, email: s.email, name: s.name, sessionId: s.session_id };

    await pool.query(
      `UPDATE admin_sessions SET expires_at = now() + ($1 || ' hours')::interval WHERE id = $2`,
      [String(SESSION_HOURS), s.session_id]
    );
    res.cookie(COOKIE_NAME, req.cookies[COOKIE_NAME], cookieOptions(SESSION_HOURS * 3600 * 1000));
    next();
  } catch (err) {
    console.error("requireAuth hatası:", err);
    res.status(500).json({ error: "Yetki kontrolü başarısız" });
  }
}

// ── Giriş mantığı ───────────────────────────────────────────────────────────
export async function attemptLogin(email, password, req = null) {
  const e = normalizeEmail(email);
  const pw = String(password || "");

  if (pw.length > MAX_PASSWORD_LEN) {
    return { ok: false, status: 400, error: "Parola uzunluğu sınırı aşıldı" };
  }

  const { rows } = await pool.query("SELECT * FROM admin_users WHERE email = $1", [e]);
  const user = rows[0];

  // Kullanıcı yoksa da sabit süre için bcrypt çalıştır → zamanlama ve kullanıcı varlığı sızıntısını önle
  if (!user) {
    await bcrypt.compare(pw, "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW");
    await logAudit(req, "LOGIN_FAIL", { email: e, detail: "Bilinmeyen e-posta" });
    return { ok: false, status: 401, error: "E-posta veya parola hatalı" };
  }
  if (!user.is_active) {
    await logAudit(req, "LOGIN_FAIL", { userId: user.id, email: e, detail: "Pasif hesap" });
    return { ok: false, status: 403, error: "Bu hesap devre dışı" };
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const min = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    await logAudit(req, "LOGIN_BLOCKED_LOCK", { userId: user.id, email: e, detail: `Kilitli (${min} dk)` });
    return {
      ok: false,
      status: 423,
      error: `Çok fazla hatalı deneme — hesap ${min} dakika kilitli`,
    };
  }

  const match = await bcrypt.compare(pw, user.password_hash);
  if (!match) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_FAILED) {
      await pool.query(
        `UPDATE admin_users
            SET failed_attempts = 0,
                locked_until = now() + ($1 || ' minutes')::interval
          WHERE id = $2`,
        [String(LOCK_MINUTES), user.id]
      );
      await logAudit(req, "ACCOUNT_LOCKED", {
        userId: user.id,
        email: e,
        detail: `${MAX_FAILED} hatalı deneme sonrası ${LOCK_MINUTES} dk kilitlendi`,
      });
      return {
        ok: false,
        status: 423,
        error: `Çok fazla hatalı deneme — hesap ${LOCK_MINUTES} dakika kilitlendi`,
      };
    }
    await pool.query("UPDATE admin_users SET failed_attempts = $1 WHERE id = $2", [
      attempts,
      user.id,
    ]);
    await logAudit(req, "LOGIN_FAIL", {
      userId: user.id,
      email: e,
      detail: `Hatalı parola (${attempts}/${MAX_FAILED})`,
    });
    // Saldırgana kaç deneme kaldığını söyleyerek e-postanın geçerli olduğunu ifşa etmeyiz
    return {
      ok: false,
      status: 401,
      error: "E-posta veya parola hatalı",
    };
  }

  await pool.query(
    "UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1",
    [user.id]
  );
  await logAudit(req, "LOGIN_OK", { userId: user.id, email: user.email });
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}

// ── E-posta ve/veya Parola Değiştirme ───────────────────────────────────────
export async function changeCredentials(userId, currentPassword, { newPassword, newEmail }, req = null) {
  const { rows } = await pool.query("SELECT * FROM admin_users WHERE id = $1", [userId]);
  const user = rows[0];
  if (!user) return { ok: false, status: 404, error: "Kullanıcı bulunamadı" };

  const match = await bcrypt.compare(String(currentPassword || ""), user.password_hash);
  if (!match) {
    await logAudit(req, "CREDENTIAL_CHANGE_FAIL", {
      userId: user.id,
      email: user.email,
      detail: "Mevcut parola yanlış",
    });
    return { ok: false, status: 401, error: "Mevcut parola hatalı" };
  }

  let targetEmail = user.email;
  if (newEmail && normalizeEmail(newEmail) !== user.email) {
    const emailErr = validateEmail(newEmail);
    if (emailErr) return { ok: false, status: 400, error: emailErr };
    targetEmail = normalizeEmail(newEmail);
    const dup = await pool.query("SELECT id FROM admin_users WHERE email = $1 AND id <> $2", [
      targetEmail,
      userId,
    ]);
    if (dup.rows.length > 0) {
      return { ok: false, status: 400, error: "Bu e-posta adresi zaten kullanımda" };
    }
  }

  let targetHash = user.password_hash;
  if (newPassword) {
    const bad = validatePassword(newPassword);
    if (bad) return { ok: false, status: 400, error: bad };
    const same = await bcrypt.compare(String(newPassword), user.password_hash);
    if (same && targetEmail === user.email) {
      return { ok: false, status: 400, error: "Yeni parola eskisiyle aynı olamaz" };
    }
    targetHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
  }

  if (targetEmail === user.email && targetHash === user.password_hash) {
    return { ok: false, status: 400, error: "Değiştirilecek yeni bir bilgi girilmedi" };
  }

  await pool.query("UPDATE admin_users SET email = $1, password_hash = $2 WHERE id = $3", [
    targetEmail,
    targetHash,
    userId,
  ]);
  await destroyAllSessions(userId);
  await logAudit(req, "CREDENTIALS_CHANGED", {
    userId,
    email: targetEmail,
    detail: `Hesap bilgileri güncellendi (tüm oturumlar kapatıldı)`,
  });
  return { ok: true, email: targetEmail };
}

export async function changePassword(userId, currentPassword, newPassword, req = null) {
  return changeCredentials(userId, currentPassword, { newPassword }, req);
}

// Aktif oturumları ve son güvenlik olaylarını döndürür
export async function getSecurityOverview(userId, currentSessionId) {
  const sessions = await pool.query(
    `SELECT id, ip, user_agent, created_at, expires_at
       FROM admin_sessions
      WHERE user_id = $1 AND expires_at > now()
      ORDER BY created_at DESC`,
    [userId]
  );
  const logs = await pool.query(
    `SELECT id, event, email, ip, detail, created_at
       FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT 15`
  );
  return {
    sessions: sessions.rows.map((s) => ({
      ...s,
      current: s.id === currentSessionId,
    })),
    logs: logs.rows,
  };
}
