import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getList } from "../../api.js";
import { timeAgo } from "../../content.jsx";

const LEVEL_CLASS = {
  "Başlangıç": "lv-basic",
  "Orta": "lv-mid",
  "İleri": "lv-adv",
};

export default function Tutorials() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("loading");
  const [filter, setFilter] = useState("HEPSİ");
  const navigate = useNavigate();

  async function load() {
    try {
      setList(await getList("egitici_yazilar"));
      setStatus("ready");
    } catch {
      setStatus("ready");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const open = (t) => navigate(`/egitici-yazilar/${t.id}`);

  const levels = ["HEPSİ", "Başlangıç", "Orta", "İleri"];
  const shown = filter === "HEPSİ" ? list : list.filter((t) => t.level === filter);

  return (
    <div className="read-page tutorials-page oy">
      <div className="grid-bg" aria-hidden />

      <div className="tut-intro">
        <h1 className="art-title">Eğitici Yazılar</h1>
        <div className="tut-levels">
          {levels.map((l) => (
            <button
              key={l}
              className={`lv-chip ${filter === l ? "active" : ""}`}
              onClick={() => setFilter(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {status === "ready" && shown.length === 0 && (
        <div className="read-info">
          <p>// bu seviyede yazı yok</p>
        </div>
      )}

      <div className="cards section-cards">
        {shown.map((t) => (
          <article key={t.id} className="card" onClick={() => open(t)}>
            <div className="card-body">
              <div className="meta">
                <span className={`lv-pill ${LEVEL_CLASS[t.level] || "lv-basic"}`}>
                  {t.level}
                </span>
                <span className="dot">/</span>
                <span>{timeAgo(t.created_at)}</span>
              </div>
              <h3>{t.title}</h3>
              {t.summary && <p>{t.summary}</p>}
              <span className="read">dersi oku →</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
