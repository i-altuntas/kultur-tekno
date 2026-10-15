import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getNews, setActive } from "../../api.js";
import { timeAgo, renderContent } from "../../content.jsx";

const BATCH = 1; // her eşik aşıldığında kaç haber eklensin

export default function Reader() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const includeAll = sp.get("src") === "all"; // pasif haberden gelindiyse pasifleri de yükle
  const [queue, setQueue] = useState([]); // tıklanan haberden itibaren akış
  const [shown, setShown] = useState(1); // kaç tanesi görünüyor
  const [status, setStatus] = useState("loading"); // loading | ready | notfound
  const [busy, setBusy] = useState(null); // durum değiştirilen haberin id'si
  const queueLen = useRef(0);

  // Haberi okuduktan sonra aktif/pasif yap
  async function toggle(a) {
    setBusy(a.id);
    try {
      const updated = await setActive(a.id, !a.is_active);
      setQueue((q) =>
        q.map((x) => (x.id === a.id ? { ...x, is_active: updated.is_active } : x))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  // Haberleri çek, tıklanan haberden itibaren kuyruğu kur
  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      try {
        const all = await getNews(undefined, { all: includeAll });
        if (!alive) return;
        const idx = all.findIndex((x) => String(x.id) === String(id));
        if (idx === -1) {
          setStatus("notfound");
          return;
        }
        const q = all.slice(idx);
        setQueue(q);
        queueLen.current = q.length;
        setShown(1);
        setStatus("ready");
        window.scrollTo(0, 0);
      } catch {
        if (alive) setStatus("notfound");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, includeAll]);

  // İçerik ekranı doldurmuyorsa (kaydırma oluşmuyorsa) kuyruktan otomatik ekle
  useEffect(() => {
    if (status !== "ready") return;
    if (shown < queue.length && document.body.offsetHeight <= window.innerHeight + 40) {
      const t = setTimeout(() => setShown((s) => s + 1), 350);
      return () => clearTimeout(t);
    }
  }, [shown, status, queue.length]);

  // Sayfayı (pencereyi) aşağı kaydırınca sona yaklaşınca yeni haber ekle → sayfa uzar
  useEffect(() => {
    function onScroll() {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800;
      if (nearBottom) {
        setShown((s) => (s < queueLen.current ? s + BATCH : s));
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="read-page">
      <div className="grid-bg" aria-hidden />

      {status === "loading" && <div className="read-info">yükleniyor…</div>}

      {status === "notfound" && (
        <div className="read-info">
          <p>// haber bulunamadı</p>
          <Link to="/" className="btn">
            ana sayfaya dön →
          </Link>
        </div>
      )}

      {status === "ready" && (
        <div className="read-stream">
          {queue.slice(0, shown).map((a, i) => (
            <article className="reader" key={a.id}>
              {i > 0 && (
                <div className="reader-sep">
                  <span>sıradaki haber</span>
                </div>
              )}
              {a.image_url && (
                <div
                  className="modal-img"
                  style={{ backgroundImage: `url(${a.image_url})` }}
                />
              )}
              <div className="meta">
                <span className="cat">{a.category}</span>
                <span className="dot">/</span>
                <span>{timeAgo(a.created_at)}</span>
              </div>
              <h2>{a.title}</h2>
              {a.summary && <p className="modal-summary">{a.summary}</p>}
              <div className="modal-content">{renderContent(a.content)}</div>

              {/* haber sonu: ortalanmış aktif/pasif kontrolü */}
              <div className="reader-actions">
                <span className={`status-pill ${a.is_active ? "on" : "off"}`}>
                  {a.is_active ? "● yayında" : "○ pasif · sitede gizli"}
                </span>
                <button
                  className={`toggle-read ${a.is_active ? "" : "muted-btn"}`}
                  onClick={() => toggle(a)}
                  disabled={busy === a.id}
                >
                  {busy === a.id
                    ? "…"
                    : a.is_active
                    ? "pasife al"
                    : "aktif et"}
                </button>
              </div>
            </article>
          ))}

          {shown >= queue.length ? (
            <div className="reader-end">
              — akışın sonu —
              <br />
              <Link to="/" className="back" style={{ marginTop: 14, display: "inline-block" }}>
                ← başa dön
              </Link>
            </div>
          ) : (
            <div className="reader-end">▼ devamı için kaydır</div>
          )}
        </div>
      )}
    </div>
  );
}
