import { useEffect, useRef, useState } from "react";
import { getList, createItem, setItemActive, deleteItem } from "../../api.js";

function fmtDate(iso) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Köşe yazıları / eğitici yazılar için genel panel.
// props:
//   resource: "kose_yazilari" | "egitici_yazilar"
//   titleText: başlık
//   extra: { key, label, type: "text"|"select", options?, placeholder? }
export default function WritingAdmin({ resource, titleText, extra }) {
  const emptyExtra = extra
    ? { [extra.key]: extra.type === "select" ? extra.options[0] : "" }
    : {};
  const EMPTY = { title: "", summary: "", content: "", ...emptyExtra };

  const [form, setForm] = useState(EMPTY);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [imgCap, setImgCap] = useState("");
  const contentRef = useRef(null);

  async function load() {
    try {
      setList(await getList(resource, { all: true }));
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    load();
  }, [resource]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function insertImage() {
    if (!imgUrl.trim()) {
      setMsg({ type: "err", text: "✗ Önce görsel URL'si gir" });
      return;
    }
    const token = `\n[img]${imgUrl.trim()}${imgCap.trim() ? ` | ${imgCap.trim()}` : ""}[/img]\n`;
    const ta = contentRef.current;
    const start = ta ? ta.selectionStart : form.content.length;
    const end = ta ? ta.selectionEnd : form.content.length;
    update("content", form.content.slice(0, start) + token + form.content.slice(end));
    setImgUrl("");
    setImgCap("");
    setMsg(null);
    requestAnimationFrame(() => {
      if (ta) {
        const pos = start + token.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await createItem(resource, form);
      setForm(EMPTY);
      setMsg({ type: "ok", text: "✓ Yayınlandı — sitede birkaç saniye içinde görünür" });
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(it) {
    try {
      await setItemActive(resource, it.id, !it.is_active);
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  async function remove(id) {
    if (!confirm("Bu yazı silinsin mi?")) return;
    try {
      await deleteItem(resource, id);
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  return (
    <div className="admin-grid">
      <section className="panel-card">
        <h2 className="panel-title">▸ YENİ {titleText.toUpperCase()}</h2>
        <form onSubmit={submit} className="form">
          {extra && (
            <label>
              {extra.label}
              {extra.type === "select" ? (
                <select value={form[extra.key]} onChange={(e) => update(extra.key, e.target.value)}>
                  {extra.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form[extra.key]}
                  onChange={(e) => update(extra.key, e.target.value)}
                  placeholder={extra.placeholder || ""}
                />
              )}
            </label>
          )}

          <label>
            Başlık *
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Başlık"
              required
            />
          </label>

          <label>
            Özet
            <input
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="Liste görünümünde çıkacak kısa açıklama"
            />
          </label>

          <label>
            İçerik *
            <textarea
              ref={contentRef}
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              placeholder="Metin (paragraflar için satır atla). Araya görsel için aşağıdaki alanı kullan."
              rows={10}
              required
            />
          </label>

          <div className="img-insert">
            <span className="img-insert-title">▸ Metne görsel ekle (birden fazla eklenebilir)</span>
            <div className="row">
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Görsel URL (https://...)" />
              <input value={imgCap} onChange={(e) => setImgCap(e.target.value)} placeholder="Açıklama (opsiyonel)" />
            </div>
            <button type="button" className="btn" onClick={insertImage}>
              + imlecin olduğu yere ekle
            </button>
          </div>

          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

          <button className="btn primary" disabled={saving}>
            {saving ? "yayınlanıyor…" : "YAYINLA ▸"}
          </button>
        </form>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">
          ▸ {titleText.toUpperCase()} ({list.filter((n) => n.is_active).length} aktif /{" "}
          {list.filter((n) => !n.is_active).length} pasif)
        </h2>
        <div className="admin-list">
          {list.length === 0 && <p className="muted">Henüz kayıt yok.</p>}
          {list.map((n) => (
            <div key={n.id} className={`admin-row ${n.is_active ? "" : "passive"}`}>
              <div className="admin-row-actions">
                <button
                  className={`toggle ${n.is_active ? "" : "muted-btn"}`}
                  onClick={() => toggle(n)}
                >
                  {n.is_active ? "pasife al" : "aktif et"}
                </button>
                <button className="del" onClick={() => remove(n.id)}>
                  sil
                </button>
              </div>
              <div className="admin-row-main">
                <div className="admin-row-top">
                  <span className={`status ${n.is_active ? "on" : "off"}`}>
                    {n.is_active ? "● AKTİF" : "○ PASİF"}
                  </span>
                  {extra && extra.showBadge !== false && (
                    <span className="cat small">{n[extra.key]}</span>
                  )}
                  <span className="admin-date">{fmtDate(n.created_at)}</span>
                </div>
                <span className="admin-row-title">{n.title}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
