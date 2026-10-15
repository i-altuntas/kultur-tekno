import { useEffect, useRef, useState } from "react";
import { getPlans, importPlan, deletePlan } from "../../api.js";

export default function PlansAdmin() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const [prog, setProg] = useState(null); // { total, done, ok, fail, current }
  const [results, setResults] = useState([]);
  const fileRef = useRef(null);

  async function load() {
    try {
      setList(await getPlans());
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Çoklu dosya: seçilenler sırayla içe aktarılır, ilerleme (X/Y) gösterilir
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
        const r = await importPlan(data);
        ok++;
        res.push({ name: file.name, ok: true, info: `${r.rows} satır` });
      } catch (err) {
        fail++;
        res.push({ name: file.name, ok: false, info: err.message });
      }
      setProg({ total: files.length, done: i + 1, ok, fail, current: null });
      setResults([...res]);
    }
    setImporting(false);
    setMsg({
      type: fail ? "err" : "ok",
      text: `✓ ${ok}/${files.length} plan içe aktarıldı${fail ? ` · ${fail} hata` : ""}`,
    });
    load();
  }

  function downloadTemplate() {
    const sample = {
      title: "2026 Bahar Ders Planı",
      description: "Örnek plan açıklaması",
      columns: ["Hafta", "Konu", "Süre", "Durum"],
      rows: [
        { Hafta: 1, Konu: "Giriş", "Süre": "2 saat", Durum: "Planlandı" },
        { Hafta: 2, Konu: "Temeller", "Süre": "3 saat", Durum: "Planlandı" },
      ],
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan-ornek.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(id) {
    if (!confirm("Bu plan (ve satırları) silinsin mi?")) return;
    try {
      await deletePlan(id);
      load();
    } catch (err) {
      setMsg({ type: "err", text: "✗ " + err.message });
    }
  }

  return (
    <section className="panel-card">
      <h2 className="panel-title">▸ PLAN EKLE (JSON)</h2>

      <div className="json-import">
        <div className="json-import-text">
          <strong>JSON ile plan içe aktar (çoklu dosya seçebilirsin)</strong>
          <p className="hint">
            Üst veri (title, description, <code>columns</code>) + <code>rows</code> dizisi; MEB
            kurs planı formatı (<code>plan_detaylari</code>) da desteklenir. Birden fazla dosya
            seçersen sırayla içe aktarılır. Üst veri ve satırlar ayrı ama bağlantılı tablolara yazılır.
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
            {importing ? "yükleniyor…" : "Plan(lar) Ekle ▸"}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" multiple hidden onChange={onImport} />
        </div>
      </div>

      {/* ilerleme (X/Y) */}
      {prog && (
        <div className="import-prog">
          <div className="import-prog-top">
            <span>
              İçe aktarılıyor: <b>{prog.done}/{prog.total}</b>
              {prog.current ? ` — ${prog.current}` : ""}
            </span>
            <span className="import-prog-counts">
              ✓ {prog.ok} {prog.fail ? `· ✗ ${prog.fail}` : ""}
            </span>
          </div>
          <div className="import-bar">
            <div className="import-bar-fill" style={{ width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* dosya bazlı sonuç listesi */}
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

      <h2 className="panel-title" style={{ marginTop: 18 }}>▸ PLANLAR ({list.length})</h2>
      <div className="admin-list">
        {list.length === 0 && <p className="muted">Henüz plan yok.</p>}
        {list.map((p) => (
          <div key={p.id} className="admin-row">
            <div className="admin-row-actions">
              <button className="del" onClick={() => remove(p.id)}>
                sil
              </button>
            </div>
            <div className="admin-row-main">
              <span className="admin-row-title">{p.title}</span>
              {p.description && <span className="muted" style={{ fontSize: 12 }}>{p.description}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
