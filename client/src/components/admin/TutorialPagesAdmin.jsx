import { useEffect, useRef, useState } from "react";
import {
  getList,
  getPages,
  createPage,
  updatePage,
  deletePage,
  importTutorial,
  setCover,
} from "../../api.js";

const COVERS = [
  { key: "aurora", name: "Aurora" },
  { key: "mesh", name: "Mesh" },
  { key: "sunset", name: "Sunset" },
  { key: "midnight", name: "Midnight" },
  { key: "neon", name: "Neon" },
  { key: "forest", name: "Forest" },
  { key: "blueprint", name: "Blueprint" },
  { key: "gold", name: "Gold" },
  { key: "paper", name: "Paper" },
  { key: "mono", name: "Mono" },
  // --- yaratıcı seri (konulara göre) ---
  { key: "min1", name: "Minimal Açık" },
  { key: "min2", name: "Minimal Koyu" },
  { key: "sur1", name: "Düşsel" },
  { key: "sur2", name: "Gerçeküstü" },
  { key: "typo1", name: "Tipografik Koyu" },
  { key: "typo2", name: "Tipografik Açık" },
  { key: "vin1", name: "Vintage" },
  { key: "vin2", name: "Retro 70" },
  { key: "goth1", name: "Gotik" },
  { key: "goth2", name: "Karanlık" },
  { key: "fan1", name: "Fantastik" },
  { key: "fan2", name: "Epik" },
  { key: "sci1", name: "Fütüristik" },
  { key: "sci2", name: "Uzay" },
  { key: "bot1", name: "Botanik" },
  { key: "bot2", name: "Doğa" },
  { key: "art1", name: "Kolaj" },
  { key: "art2", name: "Soyut" },
  { key: "iso", name: "İzometrik" },
  { key: "illus", name: "İllüzyon" },
];

const EMPTY = { id: null, page_no: "", image_url: "", audio_url: "", content: "" };

// Eğitici yazıların sayfalarını (flipbook) yönetir: seç, ekle, düzenle, sil.
export default function TutorialPagesAdmin() {
  const [tutorials, setTutorials] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [coverStyle, setCoverStyle] = useState("aurora");
  const fileRef = useRef(null);

  async function loadTutorials() {
    try {
      const list = await getList("egitici_yazilar", { all: true });
      setTutorials(list);
      if (!selectedId && list.length) setSelectedId(String(list[0].id));
    } catch (e) {
      console.error(e);
    }
  }

  async function loadPages(id) {
    if (!id) return setPages([]);
    try {
      setPages(await getPages(id));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadTutorials();
  }, []);

  useEffect(() => {
    loadPages(selectedId);
    setForm(EMPTY);
  }, [selectedId]);

  // seçili yazının mevcut kapağını göster
  useEffect(() => {
    const t = tutorials.find((x) => String(x.id) === String(selectedId));
    setCoverStyle((t && t.cover_style) || "aurora");
  }, [selectedId, tutorials]);

  async function pickCover(key) {
    if (!selectedId) {
      setMsg({ type: "err", text: "✗ Önce bir eğitici yazı seç" });
      return;
    }
    setCoverStyle(key);
    try {
      await setCover(selectedId, key);
      setMsg({ type: "ok", text: `✓ Kapak değiştirildi: ${key}` });
      loadTutorials();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!selectedId) {
      setMsg({ type: "err", text: "✗ Önce bir eğitici yazı seç" });
      return;
    }
    setSaving(true);
    setMsg(null);
    const data = {
      page_no: form.page_no === "" ? undefined : Number(form.page_no),
      image_url: form.image_url,
      audio_url: form.audio_url,
      content: form.content,
    };
    try {
      if (form.id) {
        await updatePage(form.id, data);
        setMsg({ type: "ok", text: "✓ Sayfa güncellendi" });
      } else {
        await createPage(selectedId, data);
        setMsg({ type: "ok", text: "✓ Sayfa eklendi — kitapta görünür" });
      }
      setForm(EMPTY);
      loadPages(selectedId);
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setSaving(false);
    }
  }

  function edit(pg) {
    setForm({
      id: pg.id,
      page_no: pg.page_no ?? "",
      image_url: pg.image_url || "",
      audio_url: pg.audio_url || "",
      content: pg.content || "",
    });
    setMsg(null);
  }

  async function remove(pageId) {
    if (!confirm("Bu sayfa silinsin mi?")) return;
    try {
      await deletePage(pageId);
      if (form.id === pageId) setForm(EMPTY);
      loadPages(selectedId);
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  // JSON dosyasından komple kitap içe aktar
  async function onImport(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // aynı dosya tekrar seçilebilsin
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Geçersiz JSON dosyası");
      }
      const r = await importTutorial(data);
      await loadTutorials();
      setSelectedId(String(r.id));
      setMsg({ type: "ok", text: `✓ İçe aktarıldı: "${r.title}" — ${r.pages} sayfa` });
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setImporting(false);
    }
  }

  // Örnek JSON şablonu indir
  function downloadTemplate() {
    const sample = {
      title: "Örnek Eğitici Kitap",
      level: "Başlangıç",
      summary: "Kapakta görünecek kısa açıklama",
      content: "Kapak tanıtım metni (opsiyonel)",
      pages: [
        { page_no: 1, image_url: "/devreler/01-led-yakip-sondurme-sema.png", audio_url: "/sesler/ornek/1.mp3", content: "Birinci sayfanın metni. Paragraf için satır atla." },
        { page_no: 2, image_url: "https://picsum.photos/seed/ornek/900/600", audio_url: "", content: "İkinci sayfanın metni." },
      ],
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "egitici-kitap-ornek.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel-card" style={{ marginTop: 22 }}>
      <h2 className="panel-title">▸ SAYFALAR (KİTAP / FLIPBOOK)</h2>

      {/* JSON ile komple kitap içe aktar */}
      <div className="json-import">
        <div className="json-import-text">
          <strong>JSON ile kitap içe aktar</strong>
          <p className="hint">
            Tek dosyada kapak (title, level, summary) + <code>pages</code> dizisi (her sayfa:
            page_no, image_url, content). İçe aktarınca yeni eğitici yazı kapağı ve sayfalarıyla
            otomatik oluşur. Görsel yolu <code>/devreler/...</code> veya <code>https://...</code>.
          </p>
        </div>
        <div className="json-import-actions">
          <button type="button" className="btn" onClick={downloadTemplate}>
            şablon indir
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={importing}
          >
            {importing ? "yükleniyor…" : "JSON Yükle ▸"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImport}
          />
        </div>
      </div>

      <label className="form" style={{ marginBottom: 16 }}>
        Eğitici yazı seç
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— seç —</option>
          {tutorials.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} [{t.level}] {t.title} {t.is_active ? "" : "(pasif)"}
            </option>
          ))}
        </select>
      </label>

      {selectedId && (
        <div className="cover-picker">
          <div className="cover-picker-title">▸ KAPAK TASARIMI (10 seçenek)</div>
          <div className="cover-grid">
            {COVERS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`cover-thumb cover-${c.key} ${coverStyle === c.key ? "sel" : ""}`}
                onClick={() => pickCover(c.key)}
                title={c.name}
              >
                <span className="cover-glyph" aria-hidden />
                <span className="cover-thumb-name">{c.name}</span>
                {coverStyle === c.key && <span className="cover-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="admin-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Sayfa formu */}
        <form onSubmit={submit} className="form">
          <h3 className="panel-subtitle">{form.id ? `Sayfa #${form.id} düzenle` : "Yeni sayfa"}</h3>
          <label>
            Sayfa no
            <input
              type="number"
              min="1"
              value={form.page_no}
              onChange={(e) => update("page_no", e.target.value)}
              placeholder="boş bırakılırsa sıradaki"
            />
          </label>
          <label>
            Görsel URL
            <input
              value={form.image_url}
              onChange={(e) => update("image_url", e.target.value)}
              placeholder="/devreler/... veya https://..."
            />
          </label>
          <label>
            Ses (mp3) URL — sayfa metninin seslendirmesi
            <input
              value={form.audio_url}
              onChange={(e) => update("audio_url", e.target.value)}
              placeholder="/sesler/... veya https://... (opsiyonel)"
            />
          </label>
          <label>
            Metin
            <textarea
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              placeholder="Bu sayfanın metni (paragraflar için satır atla)"
              rows={7}
            />
          </label>
          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" disabled={saving}>
              {saving ? "kaydediliyor…" : form.id ? "GÜNCELLE ▸" : "SAYFA EKLE ▸"}
            </button>
            {form.id && (
              <button type="button" className="btn" onClick={() => setForm(EMPTY)}>
                vazgeç
              </button>
            )}
          </div>
        </form>

        {/* Sayfa listesi */}
        <div>
          <h3 className="panel-subtitle">Sayfalar ({pages.length})</h3>
          <div className="admin-list">
            {pages.length === 0 && <p className="muted">Bu yazının sayfası yok.</p>}
            {pages.map((pg) => (
              <div key={pg.id} className="admin-row page-row">
                <div className="admin-row-actions">
                  <button className="toggle" onClick={() => edit(pg)}>
                    düzenle
                  </button>
                  <button className="del" onClick={() => remove(pg.id)}>
                    sil
                  </button>
                </div>
                {pg.image_url && (
                  <img className="page-thumb" src={pg.image_url} alt="" loading="lazy" />
                )}
                <div className="admin-row-main">
                  <div className="admin-row-top">
                    <span className="status on">sf. {pg.page_no}</span>
                    {pg.audio_url && <span className="status on" title="ses var">🔊</span>}
                  </div>
                  <span className="admin-row-title">
                    {(pg.content || "").slice(0, 60) || "(metin yok)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
