import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getList } from "../../api.js";
import { timeAgo } from "../../content.jsx";

export default function Columns() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("loading");
  const navigate = useNavigate();

  async function load() {
    try {
      setList(await getList("kose_yazilari"));
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

  const open = (c) => navigate(`/kose-yazilari/${c.id}`);

  return (
    <div className="read-page columns-page oy">
      <div className="grid-bg" aria-hidden />

      <div className="columns-intro">
        <h1 className="art-title">Köşe Yazıları</h1>
        <p>Yazarların kaleminden görüşler, denemeler ve tartışmalar.</p>
      </div>

      {status === "ready" && list.length === 0 && (
        <div className="read-info">
          <p>// henüz köşe yazısı yok</p>
        </div>
      )}

      <div className="cards section-cards">
        {list.map((c) => (
          <article key={c.id} className="card" onClick={() => open(c)}>
            <div className="card-body">
              <div className="meta">
                <span className="cat amber-cat">{c.author}</span>
                <span className="dot">/</span>
                <span>{timeAgo(c.created_at)}</span>
              </div>
              <h3>{c.title}</h3>
              {c.summary && <p>{c.summary}</p>}
              <span className="read">yazıyı oku →</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
