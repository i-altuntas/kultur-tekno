import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { pool } from "./db.js";

// Site-göreli görseller (/devreler/...) buradan kopyalanır
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PUBLIC = path.resolve(SERVER_DIR, "..", "client", "public");

const TABLE_QUERIES = {
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
const TABLES = Object.keys(TABLE_QUERIES);
const IMG_RE = /\[img\]\s*(\S+?)\s*(?:\|[^\]]*)?\[\/img\]/gi;

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
  const data = { exportedAt: new Date().toISOString(), tables: {} };
  const counts = {};
  const urls = new Set();
  for (const t of TABLES) {
    const { rows } = await pool.query(TABLE_QUERIES[t]);
    data.tables[t] = rows;
    counts[t] = rows.length;
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
  fs.writeFileSync(path.join(folder, "data.json"), JSON.stringify(data, null, 2), "utf8");

  // 2) pg_dump ile SQL yedeği (varsa)
  let sqlOk = false;
  let sqlNote = "";
  try {
    await pgDump(path.join(folder, "database.sql"));
    sqlOk = true;
  } catch (e) {
    sqlNote = e.message || "pg_dump çalıştırılamadı";
  }

  // 3) Görselleri indir
  const img = { total: urls.size, downloaded: 0, failed: 0, skipped: 0 };
  if (downloadImages && urls.size) {
    const imgDir = path.join(folder, "gorseller");
    fs.mkdirSync(imgDir, { recursive: true });
    const mapLines = [];
    let i = 0;
    for (const u of urls) {
      i++;
      const idx = String(i).padStart(3, "0");
      try {
        if (/^https?:\/\//i.test(u)) {
          // Dış URL → indir (User-Agent başlığıyla; 429/503'te yeniden dene)
          let res;
          for (let attempt = 0; ; attempt++) {
            const ctrl = AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined;
            res = await fetch(u, {
              headers: { "User-Agent": "KulturTekno-Backup/1.0 (yedekleme)" },
              ...(ctrl ? { signal: ctrl } : {}),
            });
            if (res.ok) break;
            if ((res.status === 429 || res.status === 503) && attempt < 2) {
              await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
              continue;
            }
            throw new Error("HTTP " + res.status);
          }
          const buf = Buffer.from(await res.arrayBuffer());
          const file = idx + extFrom(res.headers.get("content-type"), u);
          fs.writeFileSync(path.join(imgDir, file), buf);
          img.downloaded++;
          mapLines.push(`${file}  <-  (web) ${u}`);
        } else if (u.startsWith("/")) {
          // Site-göreli yerel dosya (/devreler/...) → client/public'ten kopyala
          const rel = decodeURIComponent(u.split("?")[0]).replace(/^\/+/, "");
          const src = path.resolve(CLIENT_PUBLIC, rel);
          if (!src.startsWith(path.resolve(CLIENT_PUBLIC))) throw new Error("geçersiz yol");
          if (!fs.existsSync(src)) throw new Error("yerel dosya yok");
          const base = path.basename(src).replace(/[^\w.\-]+/g, "_");
          const file = idx + "_" + base;
          fs.copyFileSync(src, path.join(imgDir, file));
          img.downloaded++;
          mapLines.push(`${file}  <-  (yerel) ${u}`);
        } else {
          // data: veya desteklenmeyen
          img.skipped++;
          mapLines.push(`${idx}  ATLANDI (desteklenmeyen): ${u.slice(0, 60)}`);
        }
      } catch (e) {
        img.failed++;
        mapLines.push(`${idx}  HATA (${e.message}): ${u}`);
      }
    }
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
