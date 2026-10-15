import { pool } from "../db.js";

// Planlar: üst veri (planlar) + satırlar (plan_satirlari), iki bağlantılı tablo
export default function plansRoutes(app) {
  // Liste / arama (Google benzeri input bunu kullanır)
  app.get("/api/planlar", async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      let r;
      if (q) {
        r = await pool.query(
          "SELECT id, title, description, created_at FROM planlar WHERE is_active = true AND title ILIKE $1 ORDER BY title ASC LIMIT 50",
          ["%" + q + "%"]
        );
      } else {
        r = await pool.query(
          "SELECT id, title, description, created_at FROM planlar WHERE is_active = true ORDER BY created_at DESC LIMIT 100"
        );
      }
      res.json(r.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Planlar alınamadı" });
    }
  });

  // Tek planın üst verisi + sütunları + satırları (tablo)
  app.get("/api/planlar/:id/tablo", async (req, res) => {
    try {
      const p = await pool.query(
        "SELECT id, title, description, columns, meta, created_at FROM planlar WHERE id = $1",
        [req.params.id]
      );
      if (p.rows.length === 0) return res.status(404).json({ error: "Plan bulunamadı" });
      const s = await pool.query(
        "SELECT data FROM plan_satirlari WHERE plan_id = $1 ORDER BY row_no ASC, id ASC",
        [req.params.id]
      );
      res.json({ ...p.rows[0], rows: s.rows.map((x) => x.data) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Plan tablosu alınamadı" });
    }
  });

  // JSON ile plan içe aktar (üst veri + satırlar tek işlemde).
  // Hem generic {title,columns,rows} hem MEB {kurs_adi,plan_detaylari} formatını kabul eder.
  app.post("/api/planlar/import", async (req, res) => {
    const b = req.body || {};
    let title = b.title;
    let description = b.description || null;
    let meta = {};
    let columns = Array.isArray(b.columns) ? b.columns.slice() : [];
    let rows = Array.isArray(b.rows) ? b.rows : [];

    if (Array.isArray(b.plan_detaylari)) {
      title = b.kurs_adi || b.title;
      meta = {
        kurs_alani: b.kurs_alani || "",
        kurs_adi: b.kurs_adi || "",
        kurs_suresi: b.kurs_suresi || "",
      };
      description = [b.kurs_alani, b.kurs_suresi].filter(Boolean).join(" · ") || null;
      columns = ["Saat", "Öğrenme Kazanımları", "Başarım Ölçütleri"];
      rows = b.plan_detaylari.map((d) => ({
        Saat: d.saat ?? "",
        "Öğrenme Kazanımları": d.ogrenme_kazanimlari ?? "",
        "Başarım Ölçütleri": d.basarim_olcutleri ?? "",
      }));
    } else if (b.meta && typeof b.meta === "object") {
      meta = b.meta;
    }

    if (!title) return res.status(400).json({ error: "JSON içinde 'title' (veya 'kurs_adi') zorunlu" });
    if (columns.length === 0 && rows.length && rows[0] && typeof rows[0] === "object" && !Array.isArray(rows[0])) {
      columns = Object.keys(rows[0]);
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query(
        "INSERT INTO planlar (title, description, columns, meta) VALUES ($1, $2, $3::jsonb, $4::jsonb) RETURNING id",
        [title, description, JSON.stringify(columns), JSON.stringify(meta)]
      );
      const planId = ins.rows[0].id;
      let n = 0;
      for (let i = 0; i < rows.length; i++) {
        let obj = rows[i];
        if (Array.isArray(obj)) {
          const o = {};
          columns.forEach((c, ci) => (o[c] = obj[ci] ?? ""));
          obj = o;
        }
        if (!obj || typeof obj !== "object") obj = {};
        await client.query(
          "INSERT INTO plan_satirlari (plan_id, row_no, data) VALUES ($1, $2, $3::jsonb)",
          [planId, i + 1, JSON.stringify(obj)]
        );
        n++;
      }
      await client.query("COMMIT");
      res.status(201).json({ ok: true, id: planId, title, columns: columns.length, rows: n });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Plan içe aktarılamadı: " + err.message });
    } finally {
      client.release();
    }
  });

  // Plan sil (satırları CASCADE)
  app.delete("/api/planlar/:id", async (req, res) => {
    try {
      const { rowCount } = await pool.query("DELETE FROM planlar WHERE id = $1", [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: "Plan bulunamadı" });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Plan silinemedi" });
    }
  });
}
