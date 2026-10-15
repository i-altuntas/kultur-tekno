import { pool } from "../db.js";

// Genel CRUD fabrikası (köşe yazıları, eğitici yazılar, arduino projeleri).
// table/cols sabit allowlist'ten gelir; SQL enjeksiyonu riski yoktur.
export function registerResource(app, table, cols, required, label) {
  // Listele (varsayılan aktif; ?all=1 ile pasifler dahil)
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const includeInactive = req.query.all === "1" || req.query.all === "true";
      const sql =
        `SELECT * FROM ${table}` +
        (includeInactive ? "" : " WHERE is_active = true") +
        " ORDER BY created_at DESC";
      const r = await pool.query(sql);
      res.json(r.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} alınamadı` });
    }
  });

  // Tek kayıt (aktif/pasif fark etmez)
  app.get(`/api/${table}/:id`, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: `${label} bulunamadı` });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} alınamadı` });
    }
  });

  // Ekle
  app.post(`/api/${table}`, async (req, res) => {
    try {
      for (const f of required) {
        if (!req.body[f]) return res.status(400).json({ error: `${f} zorunludur` });
      }
      const keys = cols.filter((c) => req.body[c] !== undefined && req.body[c] !== "");
      for (const f of required) if (!keys.includes(f)) keys.push(f);
      const values = keys.map((k) => req.body[k]);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
      const { rows } = await pool.query(sql, values);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} eklenemedi` });
    }
  });

  // Aktif/pasif
  app.patch(`/api/${table}/:id`, async (req, res) => {
    try {
      const { is_active } = req.body;
      if (typeof is_active !== "boolean") {
        return res.status(400).json({ error: "is_active (true/false) gerekli" });
      }
      const { rows } = await pool.query(
        `UPDATE ${table} SET is_active = $1 WHERE id = $2 RETURNING *`,
        [is_active, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: `${label} bulunamadı` });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} güncellenemedi` });
    }
  });

  // Sil
  app.delete(`/api/${table}/:id`, async (req, res) => {
    try {
      const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: `${label} bulunamadı` });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} silinemedi` });
    }
  });
}
