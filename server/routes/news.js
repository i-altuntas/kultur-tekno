import { pool } from "../db.js";

// Haberler: kategoriler + haber CRUD (elle yazılmış, kategori/all filtreli)
export default function newsRoutes(app) {
  app.get("/api/categories", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT DISTINCT category FROM news WHERE is_active = true ORDER BY category"
      );
      res.json(rows.map((r) => r.category));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Kategoriler alınamadı" });
    }
  });

  // Liste: varsayılan aktif; ?all=1 pasifler dahil; ?category=... filtre
  app.get("/api/news", async (req, res) => {
    try {
      const { category, all } = req.query;
      const includeInactive = all === "1" || all === "true";
      const where = [];
      const params = [];
      if (!includeInactive) where.push("is_active = true");
      if (category && category !== "HEPSİ") {
        params.push(category);
        where.push(`category = $${params.length}`);
      }
      const sql =
        "SELECT * FROM news" +
        (where.length ? " WHERE " + where.join(" AND ") : "") +
        " ORDER BY created_at DESC";
      const result = await pool.query(sql, params);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Haberler alınamadı" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM news WHERE id = $1", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Haber bulunamadı" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Haber alınamadı" });
    }
  });

  app.post("/api/news", async (req, res) => {
    try {
      const { title, summary, content, category, image_url } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Başlık ve içerik zorunludur" });
      }
      const { rows } = await pool.query(
        `INSERT INTO news (title, summary, content, category, image_url)
         VALUES ($1, $2, $3, COALESCE(NULLIF($4,''),'GÜNDEM'), $5)
         RETURNING *`,
        [title, summary || null, content, category, image_url || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Haber eklenemedi" });
    }
  });

  app.patch("/api/news/:id", async (req, res) => {
    try {
      const { is_active } = req.body;
      if (typeof is_active !== "boolean") {
        return res.status(400).json({ error: "is_active (true/false) gerekli" });
      }
      const { rows } = await pool.query(
        "UPDATE news SET is_active = $1 WHERE id = $2 RETURNING *",
        [is_active, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Haber bulunamadı" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Haber güncellenemedi" });
    }
  });

  app.delete("/api/news/:id", async (req, res) => {
    try {
      const { rowCount } = await pool.query("DELETE FROM news WHERE id = $1", [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: "Haber bulunamadı" });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Haber silinemedi" });
    }
  });
}
