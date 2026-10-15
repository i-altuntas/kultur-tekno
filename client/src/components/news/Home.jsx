import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNews, getCategories } from "../../api.js";
import { timeAgo } from "../../content.jsx";

const POLL_MS = 5000; // otomatik yenileme aralığı

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="clock">
      {now.toLocaleTimeString("tr-TR")} · {now.toLocaleDateString("tr-TR")}
    </span>
  );
}

export default function Home() {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState("HEPSİ");
  const [live, setLive] = useState(true);
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(0);
  const navigate = useNavigate();

  async function load(cat) {
    try {
      const [n, c] = await Promise.all([getNews(cat), getCategories()]);
      setCategories(c);
      setNews(n);
      // Yeni haber geldiyse kısa bir "canlı" uyarısı yak
      if (prevCount.current && n.length > prevCount.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 2500);
      }
      prevCount.current = n.length;
    } catch (e) {
      console.error(e);
      setLive(false);
    }
  }

  useEffect(() => {
    load(active);
    const t = setInterval(() => load(active), POLL_MS);
    return () => clearInterval(t);
  }, [active]);

  // Habere tıklayınca okuma sayfasına git
  const openNews = (n) => navigate(`/haber/${n.id}`);

  const featured = news[0];
  const rest = news.slice(1);

  return (
    <div className="page">
      <div className="scanlines" aria-hidden />
      <div className="grid-bg" aria-hidden />

      {/* kayan şerit */}
      <div className="ticker">
        <div className="ticker-track">
          {[...news, ...news].map((n, i) => (
            <span key={i} className="ticker-item">
              <b>{n.category}</b> {n.title}
            </span>
          ))}
          {news.length === 0 && <span className="ticker-item">sinyal bekleniyor…</span>}
        </div>
      </div>

      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">▞</span>
          <h1>
            KÜLTÜR<span className="accent"> TEKNO</span>
            <span className="cursor">█</span>
          </h1>
          <span className="tag">// kültür & teknoloji</span>
        </div>
        <div className="masthead-right">
          <span className={`live ${live ? "on" : "off"}`}>
            <i /> {live ? "CANLI" : "BAĞLANTI YOK"}
          </span>
          <Clock />
          <Link to="/panel" className="panel-link">
            [ PANEL ]
          </Link>
        </div>
      </header>

      <nav className="filters">
        {["HEPSİ", ...categories].map((c) => (
          <button
            key={c}
            className={`chip ${active === c ? "active" : ""}`}
            onClick={() => setActive(c)}
          >
            {c}
          </button>
        ))}
        {pulse && <span className="new-flag">▲ yeni haber düştü</span>}
      </nav>

      <main className="feed">
        {news.length === 0 && (
          <div className="empty">
            <p>// akışta haber yok</p>
            <Link to="/panel" className="btn">
              Panelden ilk haberi ekle →
            </Link>
          </div>
        )}

        {featured && (
          <article className="featured" onClick={() => openNews(featured)}>
            {featured.image_url && (
              <div
                className="featured-img"
                style={{ backgroundImage: `url(${featured.image_url})` }}
              />
            )}
            <div className="featured-body">
              <div className="meta">
                <span className="cat">{featured.category}</span>
                <span className="dot">/</span>
                <span>{timeAgo(featured.created_at)}</span>
                <span className="lead-badge">MANŞET</span>
              </div>
              <h2>{featured.title}</h2>
              {featured.summary && <p>{featured.summary}</p>}
              <span className="read">devamını oku →</span>
            </div>
          </article>
        )}

        <div className="cards">
          {rest.map((n) => (
            <article key={n.id} className="card" onClick={() => openNews(n)}>
              {n.image_url && (
                <div
                  className="card-img"
                  style={{ backgroundImage: `url(${n.image_url})` }}
                />
              )}
              <div className="card-body">
                <div className="meta">
                  <span className="cat">{n.category}</span>
                  <span className="dot">/</span>
                  <span>{timeAgo(n.created_at)}</span>
                </div>
                <h3>{n.title}</h3>
                {n.summary && <p>{n.summary}</p>}
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="foot">
        <span>KÜLTÜR TEKNO © {new Date().getFullYear()}</span>
        <span>otomatik yenileme: {POLL_MS / 1000}sn · kaynak: PostgreSQL</span>
      </footer>

      {/* köşe butonu: pasife alınmış haberler */}
      <Link to="/pasif" className="fab" title="Pasife alınmış haberler">
        <span className="fab-ico">◴</span> Pasif Haberler
      </Link>
    </div>
  );
}
