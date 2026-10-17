import { pool } from "../db.js";
import { softAuth } from "./auth.js";

// Bu dosyadaki sorgular tablo/kolon ADLARINI string olarak içerir — çünkü SQL'de
// identifier bind parametresi ($1) olarak geçilemez; yalnızca DEĞERLER geçilebilir
// (ve aşağıda her değer $1/$2... ile geçiliyor).
//
// Güvenlik bu yüzden "çağıran doğru şeyi gönderir" varsayımına bırakılmaz:
// identifier'lar kayıt anında katı bir desenle doğrulanır ve tablo adları sabit
// bir allowlist'e karşı kontrol edilir. Desene uymayan bir ad sunucuyu AÇILIŞTA
// çökertir — sessizce güvensiz bir uç yayına girmesinden iyidir.
const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/; // yalnızca küçük harf/rakam/alt çizgi
const ALLOWED_TABLES = new Set([
  "kose_yazilari",
  "egitici_yazilar",
  "arduino_projeleri",
  "kurs_kitaplari",
]);

function assertIdent(name, kind) {
  if (typeof name !== "string" || !SAFE_IDENT.test(name)) {
    throw new Error(`Güvensiz ${kind} adı reddedildi: ${JSON.stringify(name)}`);
  }
  return `"${name}"`; // altırnalanmış (quoted) identifier
}

// Genel CRUD fabrikası (köşe yazıları, eğitici yazılar, arduino projeleri).
export function registerResource(app, table, cols, required, label) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`registerResource: allowlist dışı tablo: ${table}`);
  }
  const T = assertIdent(table, "tablo");
  cols.forEach((c) => assertIdent(c, "kolon"));
  required.forEach((c) => assertIdent(c, "kolon"));

  // Sorgu metinleri BURADA, kaydın bir kez çalıştığı anda kurulur. İstek işleyen
  // fonksiyonlar bu sabitleri olduğu gibi kullanır; her istekte yeniden SQL metni
  // kurgulanmaz. Böylece değişken yalnızca değerlerde ($1/$2) kalır.
  const Q = {
    listActive: `SELECT * FROM ${T} WHERE is_active = true ORDER BY created_at DESC`,
    listAll: `SELECT * FROM ${T} ORDER BY created_at DESC`,
    byId: `SELECT * FROM ${T} WHERE id = $1`,
    setActive: `UPDATE ${T} SET is_active = $1 WHERE id = $2 RETURNING *`,
    remove: `DELETE FROM ${T} WHERE id = $1`,
  };
  // Olası her kolon kombinasyonu için INSERT metnini önceden üretmek yerine,
  // kolon listesini doğrulanmış adlardan derleyen küçük bir yardımcı kullanılır.
  const buildInsert = (keys) =>
    `INSERT INTO ${T} (${keys.map((k) => `"${k}"`).join(", ")}) ` +
    `VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`;
  // Listele (varsayılan aktif; ?all=1 ile pasifler dahil)
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const includeInactive = req.query.all === "1" || req.query.all === "true";
      const r = await pool.query(includeInactive ? Q.listAll : Q.listActive);
      res.json(r.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} alınamadı` });
    }
  });

  // Tek kayıt — pasif kayıtları yalnızca giriş yapmış yönetici görebilir
  app.get(`/api/${table}/:id`, softAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(Q.byId, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: `${label} bulunamadı` });
      if (rows[0].is_active === false && !req.user) {
        return res.status(404).json({ error: `${label} bulunamadı` });
      }
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
      // keys yalnızca doğrulanmış cols/required içinden gelir — istek gövdesinden değil
      const { rows } = await pool.query(buildInsert(keys), values);
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
      const { rows } = await pool.query(Q.setActive, [is_active, req.params.id]);
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
      const { rowCount } = await pool.query(Q.remove, [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: `${label} bulunamadı` });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `${label} silinemedi` });
    }
  });
}
