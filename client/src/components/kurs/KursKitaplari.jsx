import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getList } from "../../api.js";
import { timeAgo } from "../../content.jsx";

export default function KursKitaplari() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("loading");
  const navigate = useNavigate();

  async function load() {
    try {
      setList(await getList("kurs_kitaplari"));
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

  const open = (k) => navigate(`/kurs-kitaplari/${k.id}`);

  return (
    <div className="read-page arduino-page oy">
      <div className="grid-bg" aria-hidden />

      <div className="arduino-intro">
        <h1 className="art-title">Kurs Kitapları</h1>
        <p>Kurs kitaplarını seç, kapağına tıklayıp sayfa sayfa oku.</p>
      </div>

      {status === "ready" && list.length === 0 && (
        <div className="read-info">
          <p>// henüz kurs kitabı yok</p>
        </div>
      )}

      <div className="arduino-list">
        {list.map((k) => (
          <article key={k.id} className="arduino-item" onClick={() => open(k)}>
            <div className="arduino-figure">
              {k.cover_url ? (
                <img src={k.cover_url} alt={k.title} loading="lazy" />
              ) : (
                <div className="arduino-noimg">kapak yok</div>
              )}
              <span className="arduino-badge">📖 KURS KİTABI</span>
            </div>
            <div className="arduino-body">
              <div className="arduino-meta">
                {k.author || "—"} · {timeAgo(k.created_at)}
              </div>
              <h2 className="arduino-title">{k.title}</h2>
              {k.description && <p className="arduino-summary">{k.description}</p>}
              <span className="arduino-toggle">oku →</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
