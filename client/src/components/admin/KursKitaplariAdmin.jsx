import { useEffect, useRef, useState } from "react";
import {
  getList,
  createItem,
  setItemActive,
  deleteItem,
  getBookChapters,
  createBookChapter,
  updateBookChapter,
  deleteBookChapter,
  importBook,
  updateBook,
  uploadBookCover,
} from "../../api.js";

const EMPTY_BOOK = { title: "", short_title: "", author: "", description: "", cover_url: "" };
const EMPTY_CHAP = { id: null, bolum_no: "", title: "", content: "" };

export default function KursKitaplariAdmin() {
  const [books, setBooks] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [chapters, setChapters] = useState([]);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [chapForm, setChapForm] = useState(EMPTY_CHAP);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [prog, setProg] = useState(null);
  const [results, setResults] = useState([]);
  const fileRef = useRef(null);
  const coverRef = useRef(null);
  const [bookEdit, setBookEdit] = useState(null); // seçili kitabın düzenlenebilir alanları
  const [coverBusy, setCoverBusy] = useState(false);

  async function loadBooks() {
    try {
      setBooks(await getList("kurs_kitaplari", { all: true }));
    } catch (e) {
      console.error(e);
    }
  }
  async function loadChapters(id) {
    if (!id) return setChapters([]);
    try {
      setChapters(await getBookChapters(id));
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    loadBooks();
  }, []);
  useEffect(() => {
    loadChapters(selectedId);
    setChapForm(EMPTY_CHAP);
  }, [selectedId]);

  // seçili kitabın bilgilerini düzenleme state'ine doldur
  useEffect(() => {
    const b = books.find((x) => String(x.id) === String(selectedId));
    setBookEdit(
      b
        ? {
            title: b.title || "",
            short_title: b.short_title || "",
            author: b.author || "",
            description: b.description || "",
            cover_url: b.cover_url || "",
          }
        : null
    );
  }, [selectedId, books]);

  async function saveBookMeta() {
    if (!selectedId || !bookEdit) return;
    try {
      await updateBook(selectedId, bookEdit);
      setMsg({ type: "ok", text: "✓ Kitap bilgileri güncellendi" });
      loadBooks();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  async function onCoverFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !selectedId) return;
    setCoverBusy(true);
    setMsg(null);
    try {
      const r = await uploadBookCover(selectedId, file);
      setBookEdit((f) => (f ? { ...f, cover_url: r.cover_url } : f));
      setMsg({ type: "ok", text: "✓ Kapak yüklendi" });
      loadBooks();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setCoverBusy(false);
    }
  }

  async function createBook(e) {
    e.preventDefault();
    if (!bookForm.title.trim()) {
      setMsg({ type: "err", text: "✗ Kitap başlığı zorunlu" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const b = await createItem("kurs_kitaplari", bookForm);
      setBookForm(EMPTY_BOOK);
      setMsg({ type: "ok", text: `✓ Kitap eklendi: ${b.title}` });
      await loadBooks();
      setSelectedId(String(b.id));
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleBook(b) {
    try {
      await setItemActive("kurs_kitaplari", b.id, !b.is_active);
      loadBooks();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }
  async function removeBook(id) {
    if (!confirm("Bu kitap ve tüm bölümleri silinsin mi?")) return;
    try {
      await deleteItem("kurs_kitaplari", id);
      if (String(id) === selectedId) setSelectedId("");
      loadBooks();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  async function submitChapter(e) {
    e.preventDefault();
    if (!selectedId) {
      setMsg({ type: "err", text: "✗ Önce bir kitap seç" });
      return;
    }
    const data = {
      bolum_no: chapForm.bolum_no === "" ? undefined : Number(chapForm.bolum_no),
      title: chapForm.title,
      content: chapForm.content,
    };
    try {
      if (chapForm.id) await updateBookChapter(chapForm.id, data);
      else await createBookChapter(selectedId, data);
      setChapForm(EMPTY_CHAP);
      loadChapters(selectedId);
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }
  function editChapter(c) {
    setChapForm({ id: c.id, bolum_no: c.bolum_no ?? "", title: c.title || "", content: c.content || "" });
  }
  async function removeChapter(bolumId) {
    if (!confirm("Bu bölüm silinsin mi?")) return;
    try {
      await deleteBookChapter(bolumId);
      if (chapForm.id === bolumId) setChapForm(EMPTY_CHAP);
      loadChapters(selectedId);
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  async function onImport(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setImporting(true);
    setMsg(null);
    setResults([]);
    const res = [];
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProg({ total: files.length, done: i, ok, fail, current: file.name });
      try {
        const text = await file.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Geçersiz JSON");
        }
        const r = await importBook(data);
        ok++;
        res.push({ name: file.name, ok: true, info: `${r.bolumler} bölüm` });
      } catch (err) {
        fail++;
        res.push({ name: file.name, ok: false, info: err.message });
      }
      setProg({ total: files.length, done: i + 1, ok, fail, current: null });
      setResults([...res]);
    }
    setImporting(false);
    setMsg({ type: fail ? "err" : "ok", text: `✓ ${ok}/${files.length} kitap içe aktarıldı${fail ? ` · ${fail} hata` : ""}` });
    loadBooks();
  }

  function downloadTemplate() {
    const sample = {
      title: "İnsan ve Zaman",
      short_title: "İnsan ve Zaman",
      author: "A. Yazar",
      description: "Kısa açıklama",
      cover_url: "/kapaklar/ornek.jpg",
      bolumler: [
        { bolum_no: 1, title: "İnsan ve Zaman", content: "Birinci paragraf...\n\nİkinci paragraf..." },
        { bolum_no: 2, title: "Sessizliğin Dili", content: "Paragraf...\n\nParagraf..." },
      ],
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kurs-kitabi-ornek.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const upd = (k, v) => setBookForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <section className="panel-card">
        <h2 className="panel-title">▸ KURS KİTABI — JSON İLE EKLE (çoklu)</h2>
        <div className="json-import">
          <div className="json-import-text">
            <strong>JSON ile kitap içe aktar</strong>
            <p className="hint">
              Üst veri (title, short_title, author, description, <code>cover_url</code>) +
              <code>bolumler</code> dizisi (her bölüm <code>{"{bolum_no, title, content}"}</code>;
              paragraflar <code>content</code> içinde boş satırla ayrılır). Çoklu dosya seçilebilir.
            </p>
          </div>
          <div className="json-import-actions">
            <button type="button" className="btn" onClick={downloadTemplate}>şablon indir</button>
            <button type="button" className="btn primary" onClick={() => fileRef.current && fileRef.current.click()} disabled={importing}>
              {importing ? "yükleniyor…" : "Kitap(lar) Ekle ▸"}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" multiple hidden onChange={onImport} />
          </div>
        </div>
        {prog && (
          <div className="import-prog">
            <div className="import-prog-top">
              <span>İçe aktarılıyor: <b>{prog.done}/{prog.total}</b>{prog.current ? ` — ${prog.current}` : ""}</span>
              <span className="import-prog-counts">✓ {prog.ok} {prog.fail ? `· ✗ ${prog.fail}` : ""}</span>
            </div>
            <div className="import-bar"><div className="import-bar-fill" style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }} /></div>
          </div>
        )}
        {results.length > 0 && (
          <div className="import-results">
            {results.map((r, i) => (
              <div key={i} className={`import-res ${r.ok ? "ok" : "err"}`}>
                <span className="import-res-ic">{r.ok ? "✓" : "✗"}</span>
                <span className="import-res-name">{r.name}</span>
                <span className="import-res-info">{r.info}</span>
              </div>
            ))}
          </div>
        )}
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      </section>

      <div className="admin-grid">
        <section className="panel-card">
          <h2 className="panel-title">▸ YENİ KİTAP (manuel)</h2>
          <form onSubmit={createBook} className="form">
            <label>Başlık *<input value={bookForm.title} onChange={(e) => upd("title", e.target.value)} placeholder="Kitap başlığı" required /></label>
            <label>Kısa ad (üst bilgide görünür)<input value={bookForm.short_title} onChange={(e) => upd("short_title", e.target.value)} placeholder="opsiyonel" /></label>
            <label>Yazar<input value={bookForm.author} onChange={(e) => upd("author", e.target.value)} placeholder="Yazar" /></label>
            <label>Açıklama<input value={bookForm.description} onChange={(e) => upd("description", e.target.value)} placeholder="Kısa açıklama" /></label>
            <label>Kapak görseli URL<input value={bookForm.cover_url} onChange={(e) => upd("cover_url", e.target.value)} placeholder="/kapaklar/... veya https://..." /></label>
            <button className="btn primary" disabled={saving}>{saving ? "kaydediliyor…" : "KİTAP EKLE ▸"}</button>
          </form>
        </section>

        <section className="panel-card">
          <h2 className="panel-title">▸ KİTAPLAR ({books.length})</h2>
          <div className="admin-list">
            {books.length === 0 && <p className="muted">Henüz kitap yok.</p>}
            {books.map((b) => (
              <div key={b.id} className={`admin-row ${b.is_active ? "" : "passive"}`}>
                <div className="admin-row-actions">
                  <button className={`toggle ${b.is_active ? "" : "muted-btn"}`} onClick={() => toggleBook(b)}>{b.is_active ? "pasife al" : "aktif et"}</button>
                  <button className="del" onClick={() => removeBook(b.id)}>sil</button>
                </div>
                <div className="admin-row-main">
                  <span className="admin-row-title">{b.title}</span>
                  {b.author && <span className="muted" style={{ fontSize: 12 }}>{b.author}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel-card" style={{ marginTop: 22 }}>
        <h2 className="panel-title">▸ KİTAP BÖLÜMLERİ</h2>
        <label className="form" style={{ marginBottom: 16 }}>
          Kitap seç
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">— seç —</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>#{b.id} {b.title} {b.is_active ? "" : "(pasif)"}</option>
            ))}
          </select>
        </label>

        {selectedId && bookEdit && (
          <div className="book-edit">
            <div className="book-edit-cover">
              {bookEdit.cover_url ? (
                <img src={bookEdit.cover_url} alt="kapak" />
              ) : (
                <div className="book-edit-nocover">kapak yok</div>
              )}
              <button type="button" className="btn primary" onClick={() => coverRef.current && coverRef.current.click()} disabled={coverBusy}>
                {coverBusy ? "yükleniyor…" : "Kapak görseli yükle"}
              </button>
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={onCoverFile} />
            </div>
            <div className="book-edit-fields form">
              <h3 className="panel-subtitle">Seçili kitap — bilgiler & kapak</h3>
              <label>Başlık<input value={bookEdit.title} onChange={(e) => setBookEdit((f) => ({ ...f, title: e.target.value }))} /></label>
              <div className="row">
                <label>Kısa ad<input value={bookEdit.short_title} onChange={(e) => setBookEdit((f) => ({ ...f, short_title: e.target.value }))} /></label>
                <label>Yazar<input value={bookEdit.author} onChange={(e) => setBookEdit((f) => ({ ...f, author: e.target.value }))} /></label>
              </div>
              <label>Açıklama<input value={bookEdit.description} onChange={(e) => setBookEdit((f) => ({ ...f, description: e.target.value }))} /></label>
              <label>Kapak görseli URL (yüklersen otomatik dolar)<input value={bookEdit.cover_url} onChange={(e) => setBookEdit((f) => ({ ...f, cover_url: e.target.value }))} placeholder="/kapaklar/... veya https://..." /></label>
              <button type="button" className="btn primary" onClick={saveBookMeta}>BİLGİLERİ KAYDET ▸</button>
            </div>
          </div>
        )}

        {selectedId && (
          <div className="admin-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <form onSubmit={submitChapter} className="form">
              <h3 className="panel-subtitle">{chapForm.id ? `Bölüm #${chapForm.id} düzenle` : "Yeni bölüm"}</h3>
              <div className="row">
                <label>Bölüm no<input type="number" min="1" value={chapForm.bolum_no} onChange={(e) => setChapForm((f) => ({ ...f, bolum_no: e.target.value }))} placeholder="boş = sıradaki" /></label>
                <label>Bölüm başlığı<input value={chapForm.title} onChange={(e) => setChapForm((f) => ({ ...f, title: e.target.value }))} placeholder="ör. İnsan ve Zaman" /></label>
              </div>
              <label>Metin (paragraflar boş satırla ayrılır)<textarea value={chapForm.content} onChange={(e) => setChapForm((f) => ({ ...f, content: e.target.value }))} rows={10} placeholder={"Birinci paragraf...\n\nİkinci paragraf..."} /></label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary">{chapForm.id ? "GÜNCELLE ▸" : "BÖLÜM EKLE ▸"}</button>
                {chapForm.id && <button type="button" className="btn" onClick={() => setChapForm(EMPTY_CHAP)}>vazgeç</button>}
              </div>
            </form>

            <div>
              <h3 className="panel-subtitle">Bölümler ({chapters.length})</h3>
              <div className="admin-list">
                {chapters.length === 0 && <p className="muted">Bu kitabın bölümü yok.</p>}
                {chapters.map((c) => (
                  <div key={c.id} className="admin-row">
                    <div className="admin-row-actions">
                      <button className="toggle" onClick={() => editChapter(c)}>düzenle</button>
                      <button className="del" onClick={() => removeChapter(c.id)}>sil</button>
                    </div>
                    <div className="admin-row-main">
                      <div className="admin-row-top"><span className="status on">Bölüm {c.bolum_no}</span></div>
                      <span className="admin-row-title">{c.title || (c.content || "").slice(0, 50) || "(başlıksız)"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
