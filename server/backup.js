import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { pool } from "./db.js";

// Site-göreli görseller (/devreler/...) buradan kopyalanır
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PUBLIC = path.resolve(SERVER_DIR, "..", "client", "public");
const DIST_DIR = process.env.DIST_DIR || path.resolve(SERVER_DIR, "..", "client", "dist");
const UPLOAD_DIR = process.env.UPLOAD_DIR || CLIENT_PUBLIC;

export const TABLE_QUERIES = {
  news: "SELECT * FROM news ORDER BY id",
  kose_yazilari: "SELECT * FROM kose_yazilari ORDER BY id",
  egitici_yazilar: "SELECT * FROM egitici_yazilar ORDER BY id",
  egitici_sayfalar: "SELECT * FROM egitici_sayfalar ORDER BY id",
  arduino_projeleri: "SELECT * FROM arduino_projeleri ORDER BY id",
  kurs_kitaplari: "SELECT * FROM kurs_kitaplari ORDER BY id",
  kurs_bolumleri: "SELECT * FROM kurs_bolumleri ORDER BY id",
  kurs_kitap_sayfalari: "SELECT * FROM kurs_kitap_sayfalari ORDER BY id",
  planlar: "SELECT * FROM planlar ORDER BY id",
  plan_satirlari: "SELECT * FROM plan_satirlari ORDER BY id",
};
export const TABLES = Object.keys(TABLE_QUERIES);
const IMG_RE = /\[img\]\s*(\S+?)\s*(?:\|[^\]]*)?\[\/img\]/gi;

// Tüm içerik tablolarının ve kolonlarının hedef ortamda var olmasını garanti eder (idempotent)
export async function ensureContentSchema(db = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS news (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      summary    TEXT,
      content    TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'GÜNDEM',
      image_url  TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true");

  await db.query(`
    CREATE TABLE IF NOT EXISTS kose_yazilari (
      id         SERIAL PRIMARY KEY,
      author     TEXT NOT NULL DEFAULT 'Editör',
      title      TEXT NOT NULL,
      summary    TEXT,
      content    TEXT NOT NULL,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS egitici_yazilar (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      summary     TEXT,
      content     TEXT NOT NULL,
      level       TEXT NOT NULL DEFAULT 'Başlangıç',
      cover_style TEXT NOT NULL DEFAULT 'aurora',
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE egitici_yazilar ADD COLUMN IF NOT EXISTS cover_style TEXT NOT NULL DEFAULT 'aurora'");

  await db.query(`
    CREATE TABLE IF NOT EXISTS egitici_sayfalar (
      id         SERIAL PRIMARY KEY,
      yazi_id    INTEGER NOT NULL REFERENCES egitici_yazilar(id) ON DELETE CASCADE,
      page_no    INTEGER NOT NULL DEFAULT 1,
      content    TEXT,
      image_url  TEXT,
      audio_url  TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE egitici_sayfalar ADD COLUMN IF NOT EXISTS audio_url TEXT");
  await db.query("CREATE INDEX IF NOT EXISTS idx_egitici_sayfalar_yazi ON egitici_sayfalar(yazi_id, page_no)");

  await db.query(`
    CREATE TABLE IF NOT EXISTS arduino_projeleri (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      summary    TEXT,
      content    TEXT NOT NULL,
      image_url  TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS planlar (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      columns     JSONB NOT NULL DEFAULT '[]'::jsonb,
      meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE planlar ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb");

  await db.query(`
    CREATE TABLE IF NOT EXISTS plan_satirlari (
      id         SERIAL PRIMARY KEY,
      plan_id    INTEGER NOT NULL REFERENCES planlar(id) ON DELETE CASCADE,
      row_no     INTEGER NOT NULL DEFAULT 1,
      data       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_plan_satirlari_plan ON plan_satirlari(plan_id, row_no)");

  await db.query(`
    CREATE TABLE IF NOT EXISTS kurs_kitaplari (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      short_title TEXT,
      author      TEXT,
      description TEXT,
      cover_url   TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE kurs_kitaplari ADD COLUMN IF NOT EXISTS short_title TEXT");

  await db.query(`
    CREATE TABLE IF NOT EXISTS kurs_bolumleri (
      id         SERIAL PRIMARY KEY,
      kitap_id   INTEGER NOT NULL REFERENCES kurs_kitaplari(id) ON DELETE CASCADE,
      bolum_no   INTEGER NOT NULL DEFAULT 1,
      title      TEXT,
      content    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_kurs_bolumleri ON kurs_bolumleri(kitap_id, bolum_no)");

  await db.query(`
    CREATE TABLE IF NOT EXISTS kurs_kitap_sayfalari (
      id         SERIAL PRIMARY KEY,
      kitap_id   INTEGER NOT NULL REFERENCES kurs_kitaplari(id) ON DELETE CASCADE,
      page_no    INTEGER NOT NULL DEFAULT 1,
      content    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_kurs_kitap_sayfalari ON kurs_kitap_sayfalari(kitap_id, page_no)");
}

// Yüklenen kitap kapaklarını (/kapaklar/...) JSON yedeğine base64 olarak dahil eder
export function collectCoverAssets() {
  const kapaklar = {};
  const dirs = [
    path.join(UPLOAD_DIR, "kapaklar"),
    path.join(CLIENT_PUBLIC, "kapaklar"),
    path.join(DIST_DIR, "kapaklar"),
  ];
  const seen = new Set();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (seen.has(name)) continue;
      if (!/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(name)) continue;
      const full = path.join(dir, name);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && st.size > 0 && st.size <= 10 * 1024 * 1024) {
          kapaklar[name] = fs.readFileSync(full).toString("base64");
          seen.add(name);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return { kapaklar };
}

// İçe aktarma sırasında yedekteki kapak görsellerini hedef ortamın UPLOAD_DIR/kapaklar klasörüne yazar
export function restoreCoverAssets(assets) {
  if (!assets || typeof assets !== "object" || !assets.kapaklar || typeof assets.kapaklar !== "object") {
    return 0;
  }
  const dir = path.join(UPLOAD_DIR, "kapaklar");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    return 0;
  }
  let written = 0;
  for (const [rawName, b64] of Object.entries(assets.kapaklar)) {
    const safeName = path.basename(String(rawName || ""));
    if (!safeName || !/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(safeName)) continue;
    if (typeof b64 !== "string" || !b64.length) continue;
    try {
      const buf = Buffer.from(b64, "base64");
      if (!buf.length) continue;
      fs.writeFileSync(path.join(dir, safeName), buf);
      written++;
    } catch {
      /* ignore */
    }
  }
  return written;
}

// Tüm veritabanı tablolarını ve kapak görsellerini dışa aktarır
export async function exportDatabasePayload() {
  await ensureContentSchema(pool);
  const tables = {};
  const counts = {};
  let totalRows = 0;
  for (const t of TABLES) {
    const { rows } = await pool.query(TABLE_QUERIES[t]);
    tables[t] = rows;
    counts[t] = rows.length;
    totalRows += rows.length;
  }
  const assets = collectCoverAssets();
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    totalRows,
    counts,
    tables,
    assets,
  };
}

function extFrom(ct, url) {
  ct = (ct || "").toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("svg")) return ".svg";
  const m = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  if (m) return "." + m[1].toLowerCase();
  return ".img";
}

function findPgDump() {
  const cands = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
  ];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return "pg_dump"; // PATH'te varsa
}

function pgDump(outFile) {
  return new Promise((resolve, reject) => {
    const bin = findPgDump();
    const args = [
      "-h", process.env.PGHOST || "localhost",
      "-p", String(process.env.PGPORT || 5432),
      "-U", process.env.PGUSER || "postgres",
      "-d", process.env.PGDATABASE || "citynews",
      "-T", "admin_users",
      "-T", "admin_sessions",
      "-T", "admin_audit_logs",
      "-f", outFile,
    ];
    const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || "" };
    execFile(bin, args, { env, windowsHide: true }, (err, _so, se) => {
      if (err) return reject(new Error((se || err.message || "").trim()));
      resolve();
    });
  });
}

// Sunucuda yerel klasör seçme penceresi açar (Windows).
// Pencereyi en öne getirmek için görünmez, TopMost bir sahip (owner) form kullanır;
// aksi halde diyalog tarayıcının arkasında kalıp "açılmıyor" gibi görünebilir.
export function pickFolder() {
  return new Promise((resolve) => {
    const ps = [
      "Add-Type -AssemblyName System.Windows.Forms;",
      "$owner = New-Object System.Windows.Forms.Form;",
      "$owner.TopMost = $true; $owner.ShowInTaskbar = $false; $owner.Opacity = 0;",
      "$owner.Width = 1; $owner.Height = 1; $owner.StartPosition = 'CenterScreen';",
      "$owner.Add_Shown({ $owner.Activate(); $owner.BringToFront() });",
      "$owner.Show();",
      "[System.Windows.Forms.Application]::DoEvents();",
      "$dlg = New-Object System.Windows.Forms.FolderBrowserDialog;",
      "$dlg.Description = 'Yedekleme klasorunu sec'; $dlg.ShowNewFolderButton = $true;",
      "$r = $dlg.ShowDialog($owner);",
      "$owner.Close();",
      "if ($r -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dlg.SelectedPath) }",
    ].join(" ");
    execFile(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", ps],
      { windowsHide: false, timeout: 180000, maxBuffer: 1024 * 1024 },
      (err, so) => {
        if (err) {
          if (err.killed) {
            return resolve({
              error: "Klasör penceresi zaman aşımına uğradı. Yolu elle yazabilirsin.",
            });
          }
          return resolve({ error: err.message });
        }
        const p = (so || "").trim();
        resolve(p ? { path: p } : { canceled: true });
      }
    );
  });
}

function resolveLocalAsset(rel) {
  for (const baseDir of [UPLOAD_DIR, CLIENT_PUBLIC, DIST_DIR]) {
    const absBase = path.resolve(baseDir);
    const candidate = path.resolve(absBase, rel);
    if (candidate.startsWith(absBase) && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function runBackup({ targetPath, downloadImages = true }) {
  if (!targetPath || !String(targetPath).trim()) {
    throw new Error("Yedekleme yolu boş. Önce bir klasör seç.");
  }
  targetPath = String(targetPath).trim();

  // Zaman damgalı alt klasör
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const folder = path.join(targetPath, `kultur-tekno-yedek-${stamp}`);
  fs.mkdirSync(folder, { recursive: true });

  // 1) Tabloları JSON'a aktar + görsel URL'lerini topla
  const data = await exportDatabasePayload();
  const counts = data.counts;
  const urls = new Set();
  for (const t of TABLES) {
    const rows = data.tables[t] || [];
    for (const r of rows) {
      if (r.image_url) urls.add(r.image_url);
      if (r.cover_url) urls.add(r.cover_url);
      if (r.audio_url) urls.add(r.audio_url);
      if (r.content) {
        let m;
        IMG_RE.lastIndex = 0;
        while ((m = IMG_RE.exec(r.content))) urls.add(m[1]);
      }
    }
  }
  fs.writeFileSync(path.join(folder, "data.json"), JSON.stringify(data), "utf8");

  // 2) pg_dump ile SQL yedeği (varsa)
  let sqlOk = false;
  let sqlNote = "";
  try {
    await pgDump(path.join(folder, "database.sql"));
    sqlOk = true;
  } catch (e) {
    sqlNote = e.message || "pg_dump çalıştırılamadı";
  }

  // 3) Görselleri indir (paralel işçilerle hızlı indirme)
  const img = { total: urls.size, downloaded: 0, failed: 0, skipped: 0 };
  if (downloadImages && urls.size) {
    const imgDir = path.join(folder, "gorseller");
    fs.mkdirSync(imgDir, { recursive: true });
    const urlList = Array.from(urls);
    const mapLines = new Array(urlList.length);
    let cursor = 0;

    async function worker() {
      while (cursor < urlList.length) {
        const idxZero = cursor++;
        const u = urlList[idxZero];
        const idx = String(idxZero + 1).padStart(3, "0");
        try {
          if (/^https?:\/\//i.test(u)) {
            let res;
            for (let attempt = 0; ; attempt++) {
              const ctrl = AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
              res = await fetch(u, {
                headers: { "User-Agent": "KulturTekno-Backup/1.0 (yedekleme)" },
                ...(ctrl ? { signal: ctrl } : {}),
              });
              if (res.ok) break;
              if ((res.status === 429 || res.status === 503) && attempt < 1) {
                await new Promise((r) => setTimeout(r, 800));
                continue;
              }
              throw new Error("HTTP " + res.status);
            }
            const buf = Buffer.from(await res.arrayBuffer());
            const file = idx + extFrom(res.headers.get("content-type"), u);
            fs.writeFileSync(path.join(imgDir, file), buf);
            img.downloaded++;
            mapLines[idxZero] = `${file}  <-  (web) ${u}`;
          } else if (u.startsWith("/")) {
            const rel = decodeURIComponent(u.split("?")[0]).replace(/^\/+/, "");
            const src = resolveLocalAsset(rel);
            if (!src) throw new Error("yerel dosya yok");
            const base = path.basename(src).replace(/[^\w.\-]+/g, "_");
            const file = idx + "_" + base;
            fs.copyFileSync(src, path.join(imgDir, file));
            img.downloaded++;
            mapLines[idxZero] = `${file}  <-  (yerel) ${u}`;
          } else {
            img.skipped++;
            mapLines[idxZero] = `${idx}  ATLANDI (desteklenmeyen): ${u.slice(0, 60)}`;
          }
        } catch (e) {
          img.failed++;
          mapLines[idxZero] = `${idx}  HATA (${e.message}): ${u}`;
        }
      }
    }

    const concurrency = Math.min(6, urlList.length);
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    fs.writeFileSync(path.join(imgDir, "_kaynaklar.txt"), mapLines.join("\n"), "utf8");
  }

  // 4) Özet dosyası
  const manifest =
    `KÜLTÜR TEKNO — Yedek\n` +
    `Tarih: ${new Date().toLocaleString("tr-TR")}\n\n` +
    `Kayıtlar:\n` +
    TABLES.map((t) => `  - ${t}: ${counts[t]}`).join("\n") +
    `\n\nSQL yedeği (database.sql): ${sqlOk ? "var" : "YOK — " + sqlNote}\n` +
    `Görseller: indirilen ${img.downloaded}, hata ${img.failed}, atlanan ${img.skipped} (toplam ${img.total})\n\n` +
    `Geri yükleme:\n` +
    `  - SQL: psql -U postgres -d citynews -f database.sql\n` +
    `  - veya data.json içindeki tablolar uygulamadan içe aktarılabilir.\n`;
  fs.writeFileSync(path.join(folder, "OKU.txt"), manifest, "utf8");

  return { folder, counts, images: img, sql: sqlOk, sqlNote };
}
