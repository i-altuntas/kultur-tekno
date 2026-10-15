import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getList } from "../../api.js";
import { timeAgo } from "../../content.jsx";

export default function Arduino() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("loading");
  const navigate = useNavigate();

  async function load() {
    try {
      setList(await getList("arduino_projeleri"));
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

  const open = (p) => navigate(`/arduino-projeleri/${p.id}`);

  return (
    <div className="read-page arduino-page oy">
      <div className="grid-bg" aria-hidden />

      <div className="arduino-intro">
        <h1 className="art-title">Arduino Projeleri</h1>
        <p>Projeye tıkla; devre şeması ve açıklaması ayrı sayfada açılır.</p>
      </div>

      {status === "ready" && list.length === 0 && (
        <div className="read-info">
          <p>// henüz proje yok</p>
        </div>
      )}

      <div className="arduino-list">
        {list.map((p) => (
          <article key={p.id} className="arduino-item" onClick={() => open(p)}>
            <div className="arduino-figure">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title + " devre şeması"} loading="lazy" />
              ) : (
                <div className="arduino-noimg">devre resmi yok</div>
              )}
              <span className="arduino-badge">⚡ DEVRE ŞEMASI</span>
            </div>
            <div className="arduino-body">
              <div className="arduino-meta">{timeAgo(p.created_at)}</div>
              <h2 className="arduino-title">{p.title}</h2>
              {p.summary && <p className="arduino-summary">{p.summary}</p>}
              <span className="arduino-toggle">oku →</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
