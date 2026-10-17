import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { checkAdminExists, ensureAuthSchema } from "./lib/auth.js";
import { apiGuard } from "./lib/guard.js";
import authRoutes from "./routes/auth.js";
import newsRoutes from "./routes/news.js";
import writingsRoutes from "./routes/writings.js";
import tutorialsRoutes from "./routes/tutorials.js";
import plansRoutes from "./routes/plans.js";
import booksRoutes from "./routes/books.js";
import backupRoutes from "./routes/backup.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Ters proxy (Docker/Dokploy) arkasında gerçek istemci IP'sini görmek için.
// Hz sınırı ve oturum kaydı doğru IP'yi yazsın diye gerekli.
app.set("trust proxy", 1);

// Güvenlik başlıkları (clickjacking, MIME sniffing, referrer sızıntısı vb.)
app.use(
  helmet({
    // SPA + harici görsel/CDN kullanıldığı için CSP'yi burada kapalı tutuyoruz;
    // açılacaksa img-src/script-src listesi projeye göre ayarlanmalı.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS: panel çerezle çalışır, bu yüzden "herkese açık" CORS kullanılmaz.
// Üretimde yalnızca ALLOWED_ORIGINS'teki kökenler kimlik bilgisi gönderebilir.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Aynı kökenden gelen istekler (Origin başlığı yok) ve izinli kökenler geçer
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) {
        // Geliştirme kolaylığı: liste tanımsızsa yerel Vite sunucusuna izin ver
        if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
        return cb(null, false);
      }
      return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true, // oturum çerezi için
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "100mb" })); // base64 kapaklar + veritabanı içe aktarma için

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ▼▼▼ KAPI ▼▼▼
// Kimlik doğrulama rotalarından HEMEN SONRA, içerik rotalarından ÖNCE.
// Bu sıra önemlidir: aşağıda bağlanan her uç bu kapının arkasında kalır.
authRoutes(app);
app.use(apiGuard);

// Router'ları bağla (hepsi apiGuard'ın arkasında)
newsRoutes(app);
writingsRoutes(app);
tutorialsRoutes(app);
plansRoutes(app);
booksRoutes(app);
backupRoutes(app);

// Üretim: derlenmiş istemciyi (client/dist) ve yüklenen görselleri aynı sunucudan sun.
// (Geliştirmede Vite proxy kullanılır; SERVE_STATIC=1 verilmedikçe bu blok çalışmaz.)
if (process.env.SERVE_STATIC === "1" || process.env.NODE_ENV === "production") {
  const distDir = process.env.DIST_DIR || path.resolve(__dirname, "..", "client", "dist");
  const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, "..", "client", "public");
  // Önce çalışma zamanında yüklenen görseller (kalıcı volume), sonra derlenmiş varlıklar
  app.use(express.static(uploadDir));
  app.use(express.static(distDir));
  // SPA fallback — /api dışındaki tüm yolları index.html'e yönlendir
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

const PORT = process.env.PORT || 4000;

// Kimlik doğrulama şeması hazır olmadan istek kabul etmeyiz — aksi halde ilk
// isteklerde oturum tablosu bulunamaz ve kapı 500 dönerek sağlıksız davranır.
ensureAuthSchema()
  .then(checkAdminExists)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Kültür Tekno API çalışıyor → http://localhost:${PORT}`);
      console.log("Panel koruması: etkin (varsayılan kapalı — oturum zorunlu)");
    });
  })
  .catch((err) => {
    console.error("✗ Kimlik doğrulama kurulumu başarısız — sunucu başlatılmadı:", err.message);
    process.exit(1);
  });
