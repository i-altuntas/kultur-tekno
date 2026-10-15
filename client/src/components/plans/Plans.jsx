import { useEffect, useRef, useState } from "react";
import { getPlans, getPlanTable } from "../../api.js";

export default function Plans() {
  const [query, setQuery] = useState("");
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(null); // { id,title,description,columns,rows }
  const [filters, setFilters] = useState({}); // sütun -> metin
  const [visibleCols, setVisibleCols] = useState(() => new Set()); // görünen sütunlar
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const debRef = useRef(null);

  // arama (debounce)
  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      try {
        setSugs(await getPlans(query));
      } catch {
        setSugs([]);
      }
    }, 250);
    return () => clearTimeout(debRef.current);
  }, [query]);

  // dışarı tıklayınca öneri kapat
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function choose(p) {
    setOpen(false);
    setQuery(p.title);
    setLoading(true);
    try {
      const data = await getPlanTable(p.id);
      setPlan(data);
      setFilters({});
      setVisibleCols(new Set(data.columns || [])); // başlangıçta tüm sütunlar görünür
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  const columns = (plan && plan.columns) || [];
  const rows = (plan && plan.rows) || [];
  const vcols = columns.filter((c) => visibleCols.has(c)); // görünen sütunlar (sıra korunur)
  const shown = rows.filter((r) =>
    vcols.every((c) => {
      const f = (filters[c] || "").trim().toLowerCase();
      if (!f) return true;
      return String(r[c] ?? "").toLowerCase().includes(f);
    })
  );
  const hasFilter = Object.values(filters).some((v) => (v || "").trim());

  function toggleCol(c) {
    setVisibleCols((s) => {
      const n = new Set(s);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });
  }

  return (
    <div className="page plans-page oy-bg">
      <div className="grid-bg" aria-hidden />

      <div className="plans-head">
        <h1 className="plans-title">
          PLAN<span className="accent">LAR</span>
        </h1>
        <p className="plans-sub">Plan ara, seç ve tablosunu sütunlara göre filtrele.</p>

        {/* Google benzeri arama */}
        <div className="plan-search" ref={boxRef}>
          <span className="plan-search-ic" aria-hidden>⌕</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Plan adı yaz veya seç…"
          />
          {query && (
            <button className="plan-search-clear" onClick={() => { setQuery(""); setOpen(true); }} aria-label="Temizle">
              ✕
            </button>
          )}
          {open && sugs.length > 0 && (
            <ul className="plan-suggest">
              {sugs.map((p) => (
                <li key={p.id} className="plan-suggest-item" onMouseDown={() => choose(p)}>
                  <span className="ps-title">{p.title}</span>
                  {p.description && <span className="ps-desc">{p.description}</span>}
                </li>
              ))}
            </ul>
          )}
          {open && sugs.length === 0 && (
            <ul className="plan-suggest">
              <li className="plan-suggest-empty">eşleşen plan yok</li>
            </ul>
          )}
        </div>
      </div>

      {loading && <div className="read-info">yükleniyor…</div>}

      {!loading && plan && (
        <div className="plan-result">
          <div className="plan-result-head">
            <h2>{plan.title}</h2>
            {plan.description && <p>{plan.description}</p>}
            <div className="plan-meta">
              {shown.length}/{rows.length} satır · {vcols.length}/{columns.length} sütun
              {hasFilter && (
                <button className="btn plan-clear" onClick={() => setFilters({})}>
                  filtreleri temizle
                </button>
              )}
            </div>
          </div>

          {/* sütun ekle/çıkar */}
          <div className="plan-cols">
            <span className="plan-cols-label">Sütunlar:</span>
            {columns.map((c) => (
              <button
                key={c}
                className={`plan-col-chip ${visibleCols.has(c) ? "on" : ""}`}
                onClick={() => toggleCol(c)}
                title={visibleCols.has(c) ? "Gizle" : "Göster"}
              >
                {visibleCols.has(c) ? "✓ " : "+ "}
                {c}
              </button>
            ))}
            <button className="plan-col-chip all" onClick={() => setVisibleCols(new Set(columns))}>
              tümünü göster
            </button>
          </div>

          <div className="plan-table-wrap">
            <table className="plan-table">
              <thead>
                <tr>
                  <th className="plan-num-col">#</th>
                  {vcols.map((c) => (
                    <th key={c} className={c === "Saat" ? "plan-col-narrow" : undefined}>{c}</th>
                  ))}
                </tr>
                <tr className="plan-filter-row">
                  <th className="plan-num-col" />
                  {vcols.map((c) => (
                    <th key={c} className={c === "Saat" ? "plan-col-narrow" : undefined}>
                      <input
                        className="plan-filter"
                        value={filters[c] || ""}
                        onChange={(e) => setFilters((f) => ({ ...f, [c]: e.target.value }))}
                        placeholder={`${c} filtrele`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={i}>
                    <td className="plan-num-col">{i + 1}</td>
                    {vcols.map((c) => (
                      <td key={c} className={c === "Saat" ? "plan-col-narrow" : undefined}>
                        {String(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td className="plan-empty" colSpan={vcols.length + 1}>
                      filtreye uyan satır yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !plan && (
        <div className="read-info plans-hint">
          <p>// yukarıdan bir plan ara ve seç</p>
        </div>
      )}
    </div>
  );
}
