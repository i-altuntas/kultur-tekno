import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNews } from "../../api.js";
import { timeAgo } from "../../content.jsx";

export default function Passive() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("loading");
  const navigate = useNavigate();

  async function load() {
    try {
      const all = await getNews(undefined, { all: true });
      setList(all.filter((n) => !n.is_active));
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

  // Pasif haberi açarken src=all ver ki okuma sayfası pasifi de yükleyebilsin
  const open = (n) => navigate(`/haber/${n.id}?src=all`);

  return (
    <div className="read-page">
      <div className="grid-bg" aria-hidden />

      <div className="passive-head">
        <h2>Pasife alınmış haberler ({list.length})</h2>
        <p className="muted">
          Bu haberler sitede ve akışta gizli. Açıp okuyabilir, sonundaki düğmeyle tekrar
          yayına alabilirsin.
        </p>
      </div>

      {status === "ready" && list.length === 0 && (
        <div className="read-info">
          <p>// pasif haber yok</p>
          <Link to="/" className="btn">
            ana sayfaya dön →
          </Link>
        </div>
      )}

      <div className="cards">
        {list.map((n) => (
          <article key={n.id} className="card passive-card" onClick={() => open(n)}>
            {n.image_url && (
              <div
                className="card-img"
                style={{ backgroundImage: `url(${n.image_url})` }}
              />
            )}
            <div className="card-body">
              <div className="meta">
                <span className="status-pill off">○ PASİF</span>
                <span className="cat">{n.category}</span>
                <span className="dot">/</span>
                <span>{timeAgo(n.created_at)}</span>
              </div>
              <h3>{n.title}</h3>
              {n.summary && <p>{n.summary}</p>}
              <span className="read">aç ve oku →</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
