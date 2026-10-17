import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { getItem, getPages } from "../../api.js";
import { renderContent } from "../../content.jsx";

const LV = { "Başlangıç": "lv-basic", "Orta": "lv-mid", "İleri": "lv-adv" };
const RATES = [1, 1.25, 1.5, 2];

function fmt(t) {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Görünen spread'in (idx = sol sayfa) ses kuyruğunu üretir.
function buildQueue(idx, orient, pages) {
  if (idx <= 0) return []; // kapak
  const idxs = orient === "portrait" ? [idx] : [idx, idx + 1];
  const q = [];
  for (const ci of idxs) {
    if (ci >= 1 && ci <= pages.length) {
      const pg = pages[ci - 1];
      if (pg.audio_url) q.push({ pageNo: pg.page_no, url: pg.audio_url });
    }
  }
  return q;
}

const Page = React.forwardRef(function Page({ children, className = "" }, ref) {
  return (
    <div className={`flip-page ${className}`} ref={ref}>
      {children}
    </div>
  );
});

const Cover = React.forwardRef(function Cover({ yazi }, ref) {
  return (
    <div className={`flip-page flip-cover cover-${yazi.cover_style || "aurora"}`} ref={ref}>
      <span className="cover-glyph" aria-hidden />
      <span className={`lv-pill ${LV[yazi.level] || "lv-basic"}`}>{yazi.level}</span>
      <h1 className="flip-cover-title">{yazi.title}</h1>
      {yazi.summary && <p className="flip-cover-sum">{yazi.summary}</p>}
      {yazi.content && <p className="flip-cover-intro">{yazi.content}</p>}
      <span className="flip-hint">sayfayı çevirmek için tut-sürükle →</span>
    </div>
  );
});

export default function TutorialReader() {
  const { id } = useParams();
  const [yazi, setYazi] = useState(null);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState("loading");

  const [spreadIdx, setSpreadIdx] = useState(0);
  const [orient, setOrient] = useState("landscape");
  const [queue, setQueue] = useState([]);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const playingRef = useRef(false);
  const toggleRef = useRef(() => {});

  // --- sayfa çevirme sesi (düşük gecikme için Web Audio) ---
  const flipCtxRef = useRef(null);
  const flipBufRef = useRef(null);
  const flipStateRef = useRef("read");
  const [flipSound, setFlipSound] = useState(() => {
    try {
      return localStorage.getItem("kt_flip_sound") !== "0";
    } catch {
      return true;
    }
  });
  const flipSoundRef = useRef(flipSound);
  flipSoundRef.current = flipSound;

  // çevirme sesini bir kez yükle + çöz
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        flipCtxRef.current = ctx;
        const res = await fetch("/sesler/sayfa-cevir.mp3");
        const arr = await res.arrayBuffer();
        ctx.decodeAudioData(arr.slice(0), (buf) => {
          if (alive) flipBufRef.current = buf;
        });
      } catch {
        /* ses yoksa sessizce geç */
      }
    })();
    return () => {
      alive = false;
      try {
        flipCtxRef.current && flipCtxRef.current.close();
      } catch {
        /* yoksay */
      }
    };
  }, []);

  function playFlip() {
    if (!flipSoundRef.current) return;
    const ctx = flipCtxRef.current;
    const buf = flipBufRef.current;
    if (!ctx || !buf) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      // her çevirmede hafif ton/ses farkı → tekdüze olmasın
      g.gain.value = 0.75 + Math.random() * 0.25;
      src.playbackRate.value = 0.94 + Math.random() * 0.12;
      src.connect(g).connect(ctx.destination);
      src.start();
    } catch {
      /* yoksay */
    }
  }

  function toggleFlipSound() {
    setFlipSound((v) => {
      const nv = !v;
      try {
        localStorage.setItem("kt_flip_sound", nv ? "1" : "0");
      } catch {
        /* yoksay */
      }
      return nv;
    });
  }

  // veriyi çek
  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      try {
        const [y, p] = await Promise.all([getItem("egitici_yazilar", id), getPages(id)]);
        if (!alive) return;
        setYazi(y);
        setPages(p);
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

  function startTrack(j, q) {
    const list = q || queue;
    const a = audioRef.current;
    if (!a || !list[j]) {
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    a.src = list[j].url;
    a.playbackRate = rate;
    setTrackIdx(j);
    setCurTime(0);
    a.play()
      .then(() => {
        setPlaying(true);
        playingRef.current = true;
      })
      .catch(() => {
        setPlaying(false);
        playingRef.current = false;
      });
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a || queue.length === 0) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      playingRef.current = false;
    } else if (a.src && !a.ended && a.currentTime > 0 && trackIdx < queue.length) {
      a.play().then(() => {
        setPlaying(true);
        playingRef.current = true;
      });
    } else {
      startTrack(0, queue);
    }
  }
  toggleRef.current = togglePlay;

  function onEnded() {
    const next = trackIdx + 1;
    if (next < queue.length) startTrack(next, queue);
    else {
      setPlaying(false);
      playingRef.current = false;
      setCurTime(0);
    }
  }

  function chooseRate(r) {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  function seek(e) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * a.duration;
  }

  // spread değişince (sayfa çevrilince) kuyruğu güncelle; oynatılıyorsa yeni kuyruğu baştan oku
  useEffect(() => {
    const q = buildQueue(spreadIdx, orient, pages);
    setQueue(q);
    setTrackIdx(0);
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setCurTime(0);
    setDuration(0);
    if (playingRef.current && q.length) {
      // yeni spread'i otomatik okumaya devam et
      setTimeout(() => startTrack(0, q), 60);
    } else {
      setPlaying(false);
      playingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadIdx, orient, pages]);

  // boşluk tuşu ile oynat/durdur
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target;
      const tag = t && t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // unmount'ta sesi durdur
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) a.pause();
    };
  }, []);

  const hasAudio = queue.length > 0;
  const pct = duration ? (curTime / duration) * 100 : 0;

  return (
    <div className="read-page tutorials-page oy-bg">
      <div className="grid-bg" aria-hidden />

      {/* navbar altındaki bar: artık ses oynatıcı */}
      <header className="read-top player-bar">
        <audio
          ref={audioRef}
          onEnded={onEnded}
          onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          preload="metadata"
          hidden
        />

        <button
          className={`pl-play ${playing ? "on" : ""}`}
          onClick={togglePlay}
          disabled={!hasAudio}
          title={hasAudio ? "Oynat / Duraklat (Boşluk)" : "Bu sayfalarda ses yok"}
          aria-label="Oynat/Duraklat"
        >
          {playing ? "❚❚" : "►"}
        </button>

        <div className="pl-main">
          <div className="pl-track" onClick={seek}>
            <div className="pl-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="pl-info">
            <span className="pl-time">
              {fmt(curTime)} / {fmt(duration)}
            </span>
            <span className="pl-label">
              {hasAudio ? (
                <>
                  Ses:{" "}
                  {queue.map((q, i) => (
                    <b key={q.pageNo} className={i === trackIdx && playing ? "cur" : ""}>
                      sf.{q.pageNo}
                      {i < queue.length - 1 ? " → " : ""}
                    </b>
                  ))}
                </>
              ) : (
                "ses yok — sayfayı çevir"
              )}
            </span>
          </div>
        </div>

        <div className="pl-rates">
          {RATES.map((r) => (
            <button
              key={r}
              className={`pl-rate ${rate === r ? "on" : ""}`}
              onClick={() => chooseRate(r)}
              title={`${r}x hız`}
            >
              {r}×
            </button>
          ))}
        </div>
      </header>

      {status === "loading" && <div className="read-info">yükleniyor…</div>}

      {status === "notfound" && (
        <div className="read-info">
          <p>// yazı bulunamadı</p>
          <Link to="/egitici-yazilar" className="btn">
            geri dön →
          </Link>
        </div>
      )}

      {status === "ready" && pages.length === 0 && (
        <div className="read-info">
          <p>// bu yazı için henüz sayfa eklenmemiş</p>
          <Link to="/egitici-yazilar" className="btn">
            geri dön →
          </Link>
        </div>
      )}

      {status === "ready" && pages.length > 0 && (
        <div className="book-wrap">
          <HTMLFlipBook
            key={`${id}-${pages.length}`}
            width={430}
            height={580}
            size="stretch"
            minWidth={300}
            maxWidth={640}
            minHeight={420}
            maxHeight={840}
            maxShadowOpacity={0.5}
            showCover={true}
            mobileScrollSupport={true}
            drawShadow={true}
            className="flip-book"
            onFlip={(e) => setSpreadIdx(e.data)}
            onChangeOrientation={(e) => setOrient(e.data)}
            onChangeState={(e) => {
              const st = e.data;
              // çevirme animasyonu başlarken bir kez çal
              if (st === "flipping" && flipStateRef.current !== "flipping") playFlip();
              flipStateRef.current = st;
            }}
          >
            <Cover yazi={yazi} />

            {pages.map((pg) => (
              <Page key={pg.id}>
                {pg.image_url && (
                  <div className="flip-img">
                    <img src={pg.image_url} alt={`sayfa ${pg.page_no}`} loading="lazy" />
                  </div>
                )}
                <div className="flip-text">{renderContent(pg.content || "")}</div>
                <span className="flip-no">
                  {pg.audio_url ? "🔊 " : ""}sf. {pg.page_no}
                </span>
              </Page>
            ))}

            <Page className="flip-back">
              <div className="flip-back-in">
                <span className="flip-end">— SON —</span>
                <Link to="/egitici-yazilar" className="back">
                  ← tüm eğitici yazılar
                </Link>
              </div>
            </Page>
          </HTMLFlipBook>
          <p className="book-tip">
            Sayfaları çevirmek için kenarlardan sürükle · Oynat/Duraklat için <b>Boşluk</b> tuşu
            <button
              type="button"
              className={`flip-snd-btn ${flipSound ? "on" : ""}`}
              onClick={toggleFlipSound}
              title="Sayfa çevirme sesini aç/kapat"
            >
              {flipSound ? "🔉 sayfa sesi açık" : "🔇 sayfa sesi kapalı"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
