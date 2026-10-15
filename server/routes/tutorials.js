import { pool } from "../db.js";

// Eğitici yazılara özel: JSON import (kapak+sayfalar), kapak tasarımı, sayfa CRUD (flipbook)
export default function tutorialsRoutes(app) {
  // JSON ile komple kitap içe aktar — tek işlemde (transaction)
  app.post("/api/egitici_yazilar/import", async (req, res) => {
    const b = req.body || {};
    const { title, summary, content, level, cover_style, pages } = b;
    if (!title) return res.status(400).json({ error: "JSON içinde 'title' zorunlu" });
    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: "JSON içinde en az 1 sayfalı 'pages' dizisi gerekli" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query(
        `INSERT INTO egitici_yazilar (title, summary, content, level, cover_style)
         VALUES ($1, $2, $3, COALESCE(NULLIF($4,''),'Başlangıç'), COALESCE(NULLIF($5,''),'aurora')) RETURNING id`,
        [title, summary || null, content || summary || title, level || null, cover_style || null]
      );
      const yaziId = ins.rows[0].id;
      let n = 0;
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i] || {};
        const rawNo = Number(p.page_no);
        const pno = Number.isFinite(rawNo) && rawNo > 0 ? rawNo : i + 1;
        const img = p.image_url || p.image || p.resim || p.gorsel || null;
        const aud = p.audio_url || p.audio || p.ses || p.mp3 || null;
        await client.query(
          `INSERT INTO egitici_sayfalar (yazi_id, page_no, content, image_url, audio_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [yaziId, pno, p.content || p.metin || null, img, aud]
        );
        n++;
      }
      await client.query("COMMIT");
      res.status(201).json({ ok: true, id: yaziId, title, pages: n });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "İçe aktarma başarısız: " + err.message });
    } finally {
      client.release();
    }
  });

  // Kapak tasarımını değiştir
  app.patch("/api/egitici_yazilar/:id/kapak", async (req, res) => {
    try {
      const { cover_style } = req.body;
      const { rows } = await pool.query(
        "UPDATE egitici_yazilar SET cover_style = COALESCE(NULLIF($1,''),'aurora') WHERE id = $2 RETURNING *",
        [cover_style || "", req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Eğitici yazı bulunamadı" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Kapak güncellenemedi" });
    }
  });

  // Sayfaları sırayla getir
  app.get("/api/egitici_yazilar/:id/sayfalar", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM egitici_sayfalar WHERE yazi_id = $1 ORDER BY page_no ASC, id ASC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sayfalar alınamadı" });
    }
  });

  // Sayfa ekle (page_no verilmezse sıradaki numara)
  app.post("/api/egitici_yazilar/:id/sayfalar", async (req, res) => {
    try {
      const { page_no, content, image_url, audio_url } = req.body;
      let pno = Number(page_no);
      if (!Number.isFinite(pno) || pno <= 0) {
        const m = await pool.query(
          "SELECT COALESCE(MAX(page_no),0)+1 AS n FROM egitici_sayfalar WHERE yazi_id = $1",
          [req.params.id]
        );
        pno = m.rows[0].n;
      }
      const { rows } = await pool.query(
        `INSERT INTO egitici_sayfalar (yazi_id, page_no, content, image_url, audio_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, pno, content || null, image_url || null, audio_url || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sayfa eklenemedi" });
    }
  });

  // Sayfa güncelle (verilen alanlar)
  app.patch("/api/egitici_sayfalar/:pageId", async (req, res) => {
    try {
      const allowed = ["page_no", "content", "image_url", "audio_url"];
      const keys = allowed.filter((k) => req.body[k] !== undefined);
      if (keys.length === 0) return res.status(400).json({ error: "Güncellenecek alan yok" });
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const values = keys.map((k) => req.body[k]);
      values.push(req.params.pageId);
      const { rows } = await pool.query(
        `UPDATE egitici_sayfalar SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: "Sayfa bulunamadı" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sayfa güncellenemedi" });
    }
  });

  // Sayfa sil
  app.delete("/api/egitici_sayfalar/:pageId", async (req, res) => {
    try {
      const { rowCount } = await pool.query("DELETE FROM egitici_sayfalar WHERE id = $1", [
        req.params.pageId,
      ]);
      if (rowCount === 0) return res.status(404).json({ error: "Sayfa bulunamadı" });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Sayfa silinemedi" });
    }
  });
}
