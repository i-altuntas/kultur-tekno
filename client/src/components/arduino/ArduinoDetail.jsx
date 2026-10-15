import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getItem } from "../../api.js";
import { timeAgo, renderContent } from "../../content.jsx";

export default function ArduinoDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      try {
        const d = await getItem("arduino_projeleri", id);
        if (!alive) return;
        setP(d);
        setStatus("ready");
        window.scrollTo(0, 0);
      } catch {
        if (alive) setStatus("notfound");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="read-page arduino-page oy-bg">
      <div className="grid-bg" aria-hidden />

      {status === "loading" && <div className="read-info">yükleniyor…</div>}

      {status === "notfound" && (
        <div className="read-info">
          <p>// proje bulunamadı</p>
          <Link to="/arduino-projeleri" className="btn">
            projelere dön →
          </Link>
        </div>
      )}

      {status === "ready" && p && (
        <article className="reader arduino-detail">
          <div className="arduino-figure detail">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title + " devre şeması"} />
            ) : (
              <div className="arduino-noimg">devre resmi yok</div>
            )}
            <span className="arduino-badge">⚡ DEVRE ŞEMASI</span>
          </div>

          <div className="meta">
            <span className="cat">ARDUINO</span>
            <span className="dot">/</span>
            <span>{timeAgo(p.created_at)}</span>
          </div>
          <h2>{p.title}</h2>
          {p.summary && <p className="modal-summary">{p.summary}</p>}
          <div className="modal-content">{renderContent(p.content)}</div>

          <div className="reader-end">
            <Link to="/arduino-projeleri" className="back">
              ← tüm projeler
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
