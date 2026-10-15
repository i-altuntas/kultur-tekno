import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getItem } from "../../api.js";
import { timeAgo, renderContent } from "../../content.jsx";

// Köşe yazısı / eğitici yazı okuma sayfası (haberlerdeki okuma sayfasıyla aynı düzen).
export default function WritingReader({ resource, backTo, backLabel, brand, renderMeta }) {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      try {
        const d = await getItem(resource, id);
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
  }, [resource, id]);

  return (
    <div className="read-page oy-bg">
      <div className="grid-bg" aria-hidden />

      {status === "loading" && <div className="read-info">yükleniyor…</div>}

      {status === "notfound" && (
        <div className="read-info">
          <p>// yazı bulunamadı</p>
          <Link to={backTo} className="btn">
            geri dön →
          </Link>
        </div>
      )}

      {status === "ready" && p && (
        <article className="reader">
          <div className="meta">
            {renderMeta(p)}
            <span className="dot">/</span>
            <span>{timeAgo(p.created_at)}</span>
          </div>
          <h2>{p.title}</h2>
          {p.summary && <p className="modal-summary">{p.summary}</p>}
          <div className="modal-content">{renderContent(p.content)}</div>
          <div className="reader-end">
            <Link to={backTo} className="back">
              {backLabel}
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
