import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getNews, createNews, deleteNews, setActive, pickBackupFolder, runBackup as runBackupApi, restoreDatabase } from "../../api.js";
import AccountBar from "./AccountBar.jsx";
import WritingAdmin from "./WritingAdmin.jsx";
import TutorialPagesAdmin from "./TutorialPagesAdmin.jsx";
import PlansAdmin from "./PlansAdmin.jsx";
import KursKitaplariAdmin from "./KursKitaplariAdmin.jsx";

function fmtDate(iso) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORIES = ["GÜNDEM", "TEKNOLOJİ", "BİLİM", "EKONOMİ", "SPOR", "KÜLTÜR"];

const EMPTY = {
  title: "",
  summary: "",
  content: "",
  category: "TEKNOLOJİ",
  image_url: "",
};

export default function Admin() {
  const [form, setForm] = useState(EMPTY);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [imgCap, setImgCap] = useState("");
  const [tab, setTab] = useState("haber"); // haber | kose | egitici | arduino
  const [backupPath, setBackupPath] = useState("");
  const [downloadImages, setDownloadImages] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);
  const [pickBusy, setPickBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const contentRef = useRef(null);
  const restoreRef = useRef(null);

  async function onRestoreFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("DİKKAT: Mevcut tüm veriler SİLİNİP bu yedek içe aktarılacak. Devam edilsin mi?")) return;
    setRestoreBusy(true);
    setBackupMsg({ type: "ok", text: "⏳ Veritabanı içe aktarılıyor…" });
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Geçersiz JSON dosyası");
      }
      const r = await restoreDatabase(data);
      const total = Object.values(r.counts || {}).reduce((a, b) => a + b, 0);
      setBackupMsg({ type: "ok", text: `✓ İçe aktarıldı — toplam ${total} kayıt geri yüklendi` });
    } catch (err) {
      setBackupMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setRestoreBusy(false);
    }
  }

  async function pickFolder() {
    setPickBusy(true);
    setBackupMsg({
      type: "ok",
      text: "📂 Klasör seçme penceresi açıldı — başka pencerelerin arkasında kalabilir, öne getirip klasörü seç.",
    });
    try {
      const r = await pickBackupFolder();
      if (r.path) {
        setBackupPath(r.path);
        setBackupMsg({ type: "ok", text: "✓ Klasör seçildi: " + r.path });
      } else if (r.canceled) {
        setBackupMsg(null);
      } else if (r.error) {
        setBackupMsg({ type: "err", text: "✗ " + r.error + " — Yolu elle de yazabilirsin." });
      }
    } catch (e) {
      setBackupMsg({ type: "err", text: "✗ " + e.message + " — Yolu elle yazabilirsin." });
    } finally {
      setPickBusy(false);
    }
  }

  async function doBackup() {
    if (!backupPath.trim()) {
      setBackupMsg({ type: "err", text: "✗ Önce yedekleme yolunu seç (Gözat… veya elle yaz)" });
      return;
    }
    setBackupBusy(true);
    setBackupMsg({ type: "ok", text: "⏳ Yedekleniyor… (görseller indiriliyor, biraz sürebilir)" });
    try {
      const r = await runBackupApi(backupPath, downloadImages);
      const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
      setBackupMsg({
        type: "ok",
        text: `✓ Yedeklendi → ${r.folder}  |  ${total} kayıt · görsel ${r.images.downloaded}/${r.images.total} · SQL ${r.sql ? "✓" : "yok"}`,
      });
    } catch (e) {
      setBackupMsg({ type: "err", text: "✗ " + e.message });
    } finally {
      setBackupBusy(false);
    }
  }

  async function load() {
    try {
      setList(await getNews(undefined, { all: true })); // pasifler dahil
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // İçerik metnine, imlecin olduğu yere [img] etiketi ekler
  function insertImage() {
    if (!imgUrl.trim()) {
      setMsg({ type: "err", text: "✗ Önce görsel URL'si gir" });
      return;
    }
    const token = `\n[img]${imgUrl.trim()}${imgCap.trim() ? ` | ${imgCap.trim()}` : ""}[/img]\n`;
    const ta = contentRef.current;
    const start = ta ? ta.selectionStart : form.content.length;
    const end = ta ? ta.selectionEnd : form.content.length;
    const next = form.content.slice(0, start) + token + form.content.slice(end);
    update("content", next);
    setImgUrl("");
    setImgCap("");
    setMsg(null);
    // imleci eklenen metnin sonrasına taşı
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
      await createNews(form);
      setForm(EMPTY);
      setMsg({ type: "ok", text: "✓ Haber yayınlandı — sitede birkaç saniye içinde görünür" });
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Bu haber silinsin mi?")) return;
    try {
      await deleteNews(id);
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  async function toggleActive(n) {
    try {
      await setActive(n.id, !n.is_active);
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  return (
    <div className="page admin">
      <div className="grid-bg" aria-hidden />

      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">▞</span>
          <h1>
            KÜLTÜR<span className="accent"> TEKNO</span>
            <span className="tag" style={{ marginLeft: 10 }}>// yönetim paneli</span>
          </h1>
        </div>
        <div className="masthead-right">
          <Link to="/" className="panel-link">
            [ ← SİTEYE DÖN ]
          </Link>
          <AccountBar />
        </div>
      </header>

      <section className="backup-bar">
        <span className="backup-title">▸ YEDEKLEME</span>
        <input
          className="backup-path"
          placeholder="Yedekleme klasörü (ör. C:\Users\...\Masaüstü\yedek)"
          value={backupPath}
          onChange={(e) => setBackupPath(e.target.value)}
        />
        <button className="btn" type="button" onClick={pickFolder} disabled={pickBusy}>
          {pickBusy ? "açılıyor…" : "Gözat…"}
        </button>
        <label className="backup-chk">
          <input
            type="checkbox"
            checked={downloadImages}
            onChange={(e) => setDownloadImages(e.target.checked)}
          />
          görselleri de indir
        </label>
        <button className="btn primary" type="button" onClick={doBackup} disabled={backupBusy}>
          {backupBusy ? "yedekleniyor…" : "Yedekle ▸"}
        </button>
        <button className="btn" type="button" onClick={() => restoreRef.current && restoreRef.current.click()} disabled={restoreBusy} title="Yedek data.json'u içe aktar (mevcut veriyi değiştirir)">
          {restoreBusy ? "içe aktarılıyor…" : "⬆ Veritabanı İçe Aktar"}
        </button>
        <input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={onRestoreFile} />
        {backupMsg && <div className={`msg ${backupMsg.type}`} style={{ flexBasis: "100%" }}>{backupMsg.text}</div>}
      </section>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "haber" ? "active" : ""}`} onClick={() => setTab("haber")}>
          Haberler
        </button>
        <button className={`admin-tab ${tab === "kose" ? "active" : ""}`} onClick={() => setTab("kose")}>
          Köşe Yazıları
        </button>
        <button className={`admin-tab ${tab === "egitici" ? "active" : ""}`} onClick={() => setTab("egitici")}>
          Eğitici Yazılar
        </button>
        <button className={`admin-tab ${tab === "arduino" ? "active" : ""}`} onClick={() => setTab("arduino")}>
          Arduino Projeleri
        </button>
        <button className={`admin-tab ${tab === "plan" ? "active" : ""}`} onClick={() => setTab("plan")}>
          Planlar
        </button>
        <button className={`admin-tab ${tab === "kitap" ? "active" : ""}`} onClick={() => setTab("kitap")}>
          Kurs Kitapları
        </button>
      </div>

      {tab === "plan" && <PlansAdmin />}
      {tab === "kitap" && <KursKitaplariAdmin />}

      {tab === "arduino" && (
        <WritingAdmin
          resource="arduino_projeleri"
          titleText="Arduino Projesi"
          extra={{ key: "image_url", label: "Devre resmi (URL)", type: "text", placeholder: "https://... (devre şeması görseli)", showBadge: false }}
        />
      )}

      {tab === "kose" && (
        <WritingAdmin
          resource="kose_yazilari"
          titleText="Köşe Yazısı"
          extra={{ key: "author", label: "Yazar", type: "text", placeholder: "Yazar adı" }}
        />
      )}

      {tab === "egitici" && (
        <>
          <WritingAdmin
            resource="egitici_yazilar"
            titleText="Eğitici Yazı"
            extra={{ key: "level", label: "Seviye", type: "select", options: ["Başlangıç", "Orta", "İleri"] }}
          />
          <TutorialPagesAdmin />
        </>
      )}

      {tab === "haber" && (
      <div className="admin-grid">
        {/* Form */}
        <section className="panel-card">
          <h2 className="panel-title">▸ YENİ HABER</h2>
          <form onSubmit={submit} className="form">
            <label>
              Başlık *
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Haber başlığı"
                required
              />
            </label>

            <div className="row">
              <label>
                Kategori
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Görsel URL
                <input
                  value={form.image_url}
                  onChange={(e) => update("image_url", e.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>

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
                placeholder="Haber metni (paragraflar için satır atla). Metnin arasına görsel eklemek için aşağıdaki alanı kullan."
                rows={10}
                required
              />
            </label>

            <div className="img-insert">
              <span className="img-insert-title">▸ Metne görsel ekle (birden fazla eklenebilir)</span>
              <div className="row">
                <input
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="Görsel URL (https://...)"
                />
                <input
                  value={imgCap}
                  onChange={(e) => setImgCap(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                />
              </div>
              <button type="button" className="btn" onClick={insertImage}>
                + imlecin olduğu yere ekle
              </button>
              <small className="hint">
                İpucu: içerik kutusunda imleci istediğin yere koy, sonra ekle. Görsel tam
                orada çıkar. İstediğin kadar görsel ekleyebilirsin.
              </small>
            </div>

            {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

            <button className="btn primary" disabled={saving}>
              {saving ? "yayınlanıyor…" : "YAYINLA ▸"}
            </button>
          </form>
        </section>

        {/* Mevcut haberler */}
        <section className="panel-card">
          <h2 className="panel-title">
            ▸ HABERLER ({list.filter((n) => n.is_active).length} aktif /{" "}
            {list.filter((n) => !n.is_active).length} pasif)
          </h2>
          <div className="admin-list">
            {list.length === 0 && <p className="muted">Henüz haber yok.</p>}
            {list.map((n) => (
              <div key={n.id} className={`admin-row ${n.is_active ? "" : "passive"}`}>
                <div className="admin-row-actions">
                  <button
                    className={`toggle ${n.is_active ? "" : "muted-btn"}`}
                    onClick={() => toggleActive(n)}
                    title={n.is_active ? "Sitede gizle" : "Sitede yayınla"}
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
                    <span className="cat small">{n.category}</span>
                    <span className="admin-date">{fmtDate(n.created_at)}</span>
                  </div>
                  <span className="admin-row-title">{n.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
