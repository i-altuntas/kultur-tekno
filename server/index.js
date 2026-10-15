import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import newsRoutes from "./routes/news.js";
import writingsRoutes from "./routes/writings.js";
import tutorialsRoutes from "./routes/tutorials.js";
import plansRoutes from "./routes/plans.js";
import booksRoutes from "./routes/books.js";
import backupRoutes from "./routes/backup.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" })); // base64 kapaklar + veritabanı içe aktarma için

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Router'ları bağla
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
app.listen(PORT, () => {
  console.log(`Kültür Tekno API çalışıyor → http://localhost:${PORT}`);
});
