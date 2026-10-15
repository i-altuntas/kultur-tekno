import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import { registerResource } from "../lib/resource.js";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
// routes/ -> server/ -> proje kökü -> client/public
const CLIENT_PUBLIC = path.resolve(SERVER_DIR, "..", "..", "client", "public");
// Yüklenen kapaklar üretimde kalıcı bir klasöre (Docker volume) yazılır; geliştirmede client/public
const UPLOAD_DIR = process.env.UPLOAD_DIR || CLIENT_PUBLIC;

// Kurs Kitapları: üst veri+kapak (kurs_kitaplari) + bölümler (kurs_bolumleri)
export default function booksRoutes(app) {
  registerResource(
    app,
    "kurs_kitaplari",
    ["title", "short_title", "author", "description", "cover_url"],
    ["title"],
    "Kurs kitabı"
  );

  // JSON ile komple kitap (üst veri + bölümler) içe aktar — tek işlem (transaction)
  app.post("/api/kurs_kitaplari/import", async (req, res) => {
    const b = req.body || {};
    const title = b.title || b.baslik;
    if (!title) return res.status(400).json({ error: "JSON içinde 'title' zorunlu" });
    const short_title = b.short_title || b.kisa_ad || null;
    const author = b.author || b.yazar || null;
    const description = b.description || b.aciklama || null;
    const cover_url = b.cover_url || b.kapak || b.cover || null;
    // bölümler: 'bolumler' / 'chapters' / 'pages' kabul edilir
    const chapters = Array.isArray(b.bolumler)
      ? b.bolumler
      : Array.isArray(b.chapters)
      ? b.chapters
      : Array.isArray(b.pages)
      ? b.pages
      : [];
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query(
        "INSERT INTO kurs_kitaplari (title, short_title, author, description, cover_url) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [title, short_title, author, description, cover_url]
      );
      const kitapId = ins.rows[0].id;
      let n = 0;
      for (let i = 0; i < chapters.length; i++) {
        const c = chapters[i];
        const content = typeof c === "string" ? c : c && (c.content || c.metin || c.text);
        const ctitle = typeof c === "object" && c ? c.title || c.baslik || null : null;
        const rawNo = typeof c === "object" && c ? Number(c.bolum_no ?? c.page_no ?? c.no) : NaN;
        const no = Number.isFinite(rawNo) && rawNo > 0 ? rawNo : i + 1;
        await client.query(
          "INSERT INTO kurs_bolumleri (kitap_id, bolum_no, title, content) VALUES ($1,$2,$3,$4)",
          [kitapId, no, ctitle, content || null]
        );
        n++;
      }
      await client.query("COMMIT");
      res.status(201).json({ ok: true, id: kitapId, title, bolumler: n });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Kitap içe aktarılamadı: " + err.message });
    } finally {
      client.release();
    }
  });

  // Kitap bilgilerini düzenle (başlık, kısa ad, yazar, açıklama, kapak URL)
  app.patch("/api/kurs_kitaplari/:id/duzenle", async (req, res) => {
    try {
      const allowed = ["title", "short_title", "author", "description", "cover_url"];
      const keys = allowed.filter((k) => req.body[k] !== undefined);
      if (keys.length === 0) return res.status(400).json({ error: "Güncellenecek alan yok" });
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const values = keys.map((k) => req.body[k]);
      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE kurs_kitaplari SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: "Kitap bulunamadı" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Kitap güncellenemedi" });
    }
  });

  // Kapak görseli yükle (base64) → client/public/kapaklar/ içine kaydeder, cover_url'i günceller
  app.post("/api/kurs_kitaplari/:id/kapak-yukle", async (req, res) => {
    try {
      const { filename, data } = req.body || {};
      if (!data) return res.status(400).json({ error: "Görsel verisi yok" });
      const chk = await pool.query("SELECT id FROM kurs_kitaplari WHERE id = $1", [req.params.id]);
      if (chk.rows.length === 0) return res.status(404).json({ error: "Kitap bulunamadı" });
      const b64 = String(data).includes(",") ? String(data).split(",")[1] : String(data);
      const buf = Buffer.from(b64, "base64");
      if (!buf.length) return res.status(400).json({ error: "Görsel çözülemedi" });
      let ext = (path.extname(filename || "") || ".jpg").toLowerCase();
      if (!/^\.(jpg|jpeg|png|webp|gif|avif)$/.test(ext)) ext = ".jpg";
      const dir = path.join(UPLOAD_DIR, "kapaklar");
      fs.mkdirSync(dir, { recursive: true });
      const name = `kitap-${req.params.id}-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(dir, name), buf);
      const url = `/kapaklar/${name}`;
      const { rows } = await pool.query(
        "UPDATE kurs_kitaplari SET cover_url = $1 WHERE id = $2 RETURNING *",
        [url, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Kitap bulunamadı" });
      res.json({ ok: true, cover_url: url, kitap: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Kapak yüklenemedi: " + err.message });
    }
  });

  // Kitabın bölümlerini sırayla getir
  app.get("/api/kurs_kitaplari/:id/bolumler", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM kurs_bolumleri WHERE kitap_id = $1 ORDER BY bolum_no ASC, id ASC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Bölümler alınamadı" });
    }
  });

  // Bölüm ekle (bolum_no verilmezse sıradaki)
  app.post("/api/kurs_kitaplari/:id/bolumler", async (req, res) => {
    try {
      const { bolum_no, title, content } = req.body;
      let no = Number(bolum_no);
      if (!Number.isFinite(no) || no <= 0) {
        const m = await pool.query(
          "SELECT COALESCE(MAX(bolum_no),0)+1 AS n FROM kurs_bolumleri WHERE kitap_id = $1",
          [req.params.id]
        );
        no = m.rows[0].n;
      }
      const { rows } = await pool.query(
        "INSERT INTO kurs_bolumleri (kitap_id, bolum_no, title, content) VALUES ($1,$2,$3,$4) RETURNING *",
        [req.params.id, no, title || null, content || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Bölüm eklenemedi" });
    }
  });

  // Bölüm güncelle
  app.patch("/api/kurs_bolumleri/:bolumId", async (req, res) => {
    try {
      const allowed = ["bolum_no", "title", "content"];
      const keys = allowed.filter((k) => req.body[k] !== undefined);
      if (keys.length === 0) return res.status(400).json({ error: "Güncellenecek alan yok" });
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const values = keys.map((k) => req.body[k]);
      values.push(req.params.bolumId);
      const { rows } = await pool.query(
        `UPDATE kurs_bolumleri SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: "Bölüm bulunamadı" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Bölüm güncellenemedi" });
    }
  });

  // Bölüm sil
  app.delete("/api/kurs_bolumleri/:bolumId", async (req, res) => {
    try {
      const { rowCount } = await pool.query("DELETE FROM kurs_bolumleri WHERE id = $1", [
        req.params.bolumId,
      ]);
      if (rowCount === 0) return res.status(404).json({ error: "Bölüm bulunamadı" });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Bölüm silinemedi" });
    }
  });
}
