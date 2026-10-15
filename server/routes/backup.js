import { pool } from "../db.js";
import { runBackup, pickFolder } from "../backup.js";

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

async function restoreTable(client, table, rows, jsonbCols) {
  let n = 0;
  for (const row of rows) {
    const cols = Object.keys(row);
    if (!cols.length) continue;
    const ph = cols.map((c, i) => (jsonbCols.includes(c) ? `$${i + 1}::jsonb` : `$${i + 1}`));
    const vals = cols.map((c) => (jsonbCols.includes(c) ? JSON.stringify(row[c]) : row[c]));
    await client.query(
      `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${ph.join(", ")})`,
      vals
    );
    n++;
  }
  // id sequence'ini en büyük id'ye göre ilerlet
  await client.query(
    `SELECT setval(pg_get_serial_sequence($1,'id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM ${table}),1))`,
    [table]
  );
  return n;
}

// Yedekleme uçları
export default function backupRoutes(app) {
  // Veritabanını içe aktar (yedek data.json) — MEVCUT VERİ SİLİNİR, yerine yüklenir
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
      // GÜVENLİK: Yedekte olmayan ama veritabanında DOLU olan tabloları tespit et.
      // Böyle bir tablo TRUNCATE CASCADE ile sessizce SİLİNEBİLİR → force gelmedikçe reddet.
      const missing = RESTORE_ORDER.filter((t) => !present.includes(t));
      const atRisk = [];
      for (const t of missing) {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
        if (rows[0].n > 0) atRisk.push({ table: t, rows: rows[0].n });
      }
      if (atRisk.length && !body.force) {
        return res.status(409).json({
          error:
            "Bu yedek bazı dolu tabloları içermiyor; içe aktarma bu verileri silerdi. " +
            "İçe aktarma durduruldu. Yine de devam etmek için force gönderin.",
          atRisk,
        });
      }

      await client.query("BEGIN");
      // Yalnızca yedekte bulunan tabloları temizle (CASCADE ile FK çocukları da temizlenir;
      // yukarıdaki kontrol, kaybolacak dolu bir tablo kalmadığını garanti eder).
      await client.query(`TRUNCATE ${present.join(", ")} RESTART IDENTITY CASCADE`);
      const counts = {};
      for (const t of present) {
        counts[t] = await restoreTable(client, t, tables[t], JSONB_COLS[t] || []);
      }
      await client.query("COMMIT");
      res.json({ ok: true, counts, skipped: missing });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "İçe aktarma başarısız: " + err.message });
    } finally {
      client.release();
    }
  });

  // Sunucuda klasör seçme penceresi aç (yerel kullanım)
  app.post("/api/backup/pick-folder", async (req, res) => {
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
