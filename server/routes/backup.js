import { pool } from "../db.js";
import {
  runBackup,
  pickFolder,
  exportDatabasePayload,
  ensureContentSchema,
  restoreCoverAssets,
} from "../backup.js";

// Geri yükleme: ebeveyn→çocuk sırası (FK güvenli)
const RESTORE_ORDER = [
  "news",
  "kose_yazilari",
  "arduino_projeleri",
  "egitici_yazilar",
  "egitici_sayfalar",
  "kurs_kitaplari",
  "kurs_bolumleri",
  "kurs_kitap_sayfalari",
  "planlar",
  "plan_satirlari",
];
const JSONB_COLS = { planlar: ["columns", "meta"], plan_satirlari: ["data"] };

function serializeJsonbValue(col, val) {
  if (val === null || val === undefined) {
    return col === "columns" ? "[]" : "{}";
  }
  if (typeof val === "string") {
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
}

async function restoreTable(client, table, rows, jsonbCols) {
  const validRows = Array.isArray(rows)
    ? rows.filter((r) => r && typeof r === "object" && !Array.isArray(r))
    : [];

  if (validRows.length > 0) {
    // Hedef tablodaki gerçek kolonları öğren (farklı ortamlarda kolon uyumsuzluğunu önler)
    const { rows: colMeta } = await client.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      [table]
    );
    const validColSet = new Set(colMeta.map((c) => c.column_name));

    const keySet = new Set();
    for (const r of validRows) {
      for (const k of Object.keys(r)) {
        if (validColSet.has(k) && r[k] !== undefined) keySet.add(k);
      }
    }
    const cols = Array.from(keySet);

    if (cols.length > 0) {
      const colList = cols.map((c) => `"${c}"`).join(", ");
      const batchSize = 500;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        const vals = [];
        const tuples = batch.map((row, rIdx) => {
          const ph = cols.map((c, cIdx) => {
            const paramIdx = rIdx * cols.length + cIdx + 1;
            const isJsonb = jsonbCols.includes(c);
            let v = row[c];
            if (isJsonb) {
              v = serializeJsonbValue(c, v);
            } else if (v === undefined) {
              v = null;
            }
            vals.push(v);
            return isJsonb ? `$${paramIdx}::jsonb` : `$${paramIdx}`;
          });
          return `(${ph.join(", ")})`;
        });
        const insertSql = `INSERT INTO "${table}" (${colList}) VALUES ${tuples.join(", ")}`;
        await client.query(insertSql, vals);
      }
    }
  }

  // id sequence'ini en büyük id'ye göre ilerlet (tablo boşsa is_called=false ile 1'e kur)
  const seqSql = `SELECT setval(
    pg_get_serial_sequence($1, 'id'),
    COALESCE((SELECT MAX(id) FROM "${table}"), 1),
    (SELECT MAX(id) IS NOT NULL FROM "${table}")
  )`;
  await client.query(seqSql, [table]);
  return validRows.length;
}

// Yedekleme uçları
export default function backupRoutes(app) {
  // Tüm veritabanını JSON dosyası olarak doğrudan tarayıcıya indir
  app.get("/api/backup/export", async (_req, res) => {
    try {
      const payload = await exportDatabasePayload();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `kultur-tekno-veritabani-${stamp}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Total-Rows", String(payload.totalRows || 0));
      res.setHeader("X-Table-Counts", JSON.stringify(payload.counts || {}));
      res.send(JSON.stringify(payload));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Veritabanı dışa aktarılamadı: " + err.message });
    }
  });

  // Veritabanını içe aktar (indirilen JSON veya yedek data.json) — MEVCUT VERİ SİLİNİR, yerine yüklenir
  app.post("/api/restore", async (req, res) => {
    const body = req.body || {};
    const tables = body.tables && typeof body.tables === "object" ? body.tables : body;
    if (!tables || typeof tables !== "object") {
      return res.status(400).json({ error: "Geçersiz yedek: 'tables' bulunamadı" });
    }
    // Yedekte gerçekten bulunan (dizi olan) tablolar
    const present = RESTORE_ORDER.filter((t) => Array.isArray(tables[t]));
    if (!present.length) {
      return res.status(400).json({ error: "Yedekte içe aktarılacak tablo yok" });
    }
    const client = await pool.connect();
    try {
      // Hedef ortamda tüm tabloların ve kolonların hazır olduğundan emin ol
      await ensureContentSchema(client);

      // GÜVENLİK: Yedekte olmayan ama veritabanında DOLU olan tabloları tespit et.
      // Böyle bir tablo TRUNCATE CASCADE ile sessizce SİLİNEBİLİR → force gelmedikçe reddet.
      const missing = RESTORE_ORDER.filter((t) => !present.includes(t));
      const atRisk = [];
      for (const t of missing) {
        const countSql = `SELECT COUNT(*)::int AS n FROM "${t}"`;
        const { rows } = await client.query(countSql);
        if (rows[0].n > 0) atRisk.push({ table: t, rows: rows[0].n });
      }
      if (atRisk.length && !body.force) {
        return res.status(409).json({
          error:
            "Bu yedek bazı dolu tabloları içermiyor; içe aktarma bu verileri silerdi. " +
            "İçe aktarma durduruldu. Yine de devam etmek için onaylayın.",
          atRisk,
        });
      }

      await client.query("BEGIN");
      const toTruncate = body.force ? RESTORE_ORDER : present;
      const truncateSql = `TRUNCATE ${toTruncate.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`;
      await client.query(truncateSql);
      const counts = {};
      let total = 0;
      for (const t of present) {
        counts[t] = await restoreTable(client, t, tables[t], JSONB_COLS[t] || []);
        total += counts[t];
      }
      await client.query("COMMIT");

      // Varsa yüklenmiş kitap kapaklarını da hedef ortama kopyala
      const restoredCovers = restoreCoverAssets(body.assets);

      res.json({ ok: true, counts, total, restoredCovers, skipped: missing });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "İçe aktarma başarısız: " + err.message });
    } finally {
      client.release();
    }
  });

  // Sunucuda klasör seçme penceresi aç (yerel kullanım)
  app.post("/api/backup/pick-folder", async (_req, res) => {
    try {
      res.json(await pickFolder());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Klasör seçilemedi" });
    }
  });

  // Veritabanı + görselleri seçilen yola yedekle
  app.post("/api/backup", async (req, res) => {
    try {
      const result = await runBackup({
        targetPath: req.body.path,
        downloadImages: req.body.downloadImages !== false,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Yedekleme başarısız" });
    }
  });
}
