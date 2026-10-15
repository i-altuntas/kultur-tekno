import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getItem, getBookChapters } from "../../api.js";

// Modern klasik kitap okuyucu: krem sayfa, serif tipografi, dinamik sayfalama.

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function blockHtml(b) {
  if (b.type === "chapter") {
    return `<div class="book-chap"><div class="book-chap-no">BÖLÜM ${esc(b.no)}</div>${
      b.title ? `<h2 class="book-chap-title">${esc(b.title)}</h2>` : ""
    }</div>`;
  }
  return `<p class="book-para${b.cont ? " cont" : ""}">${esc(b.text)}</p>`;
}

// Bölümlerden akış bloklarını üret
function buildBlocks(chapters) {
  const blocks = [];
  for (const c of chapters) {
    blocks.push({ type: "chapter", no: c.bolum_no, title: c.title || "" });
    const paras = String(c.content || "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of paras) blocks.push({ type: "para", text: p });
  }
  return blocks;
}

// Uzun tek paragrafı sayfaya sığacak parçalara böl (kelime bazlı)
function splitPara(b, measurer, maxH) {
  const words = b.text.split(/\s+/);
  const chunks = [];
  let cur = [];
  const fits = (arr, cont) => {
    measurer.innerHTML = blockHtml({ type: "para", text: arr.join(" "), cont });
    return measurer.scrollHeight <= maxH;
  };
  for (const w of words) {
    const trial = cur.concat(w);
    if (fits(trial, chunks.length > 0) || cur.length === 0) cur = trial;
    else {
      chunks.push(cur);
      cur = [w];
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks.map((c, i) => ({ type: "para", text: c.join(" "), cont: i > 0 }));
}

function paginate(blocks, measurer, maxH, width) {
  measurer.style.width = width + "px";
  const pages = [];
  let cur = [];
  const fits = (arr) => {
    measurer.innerHTML = arr.map(blockHtml).join("");
    return measurer.scrollHeight <= maxH;
  };
  const push = () => {
    if (cur.length) {
      pages.push(cur);
      cur = [];
    }
  };
  for (const b of blocks) {
    if (b.type === "chapter") {
      push();
      cur = [b];
      continue;
    }
    if (fits(cur.concat(b))) {
      cur.push(b);
      continue;
    }
    // sığmadı
    if (cur.length === 0) {
      const parts = splitPara(b, measurer, maxH);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) push();
        cur = [parts[i]];
      }
      continue;
    }
    push();
    if (fits([b])) cur = [b];
    else {
      const parts = splitPara(b, measurer, maxH);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) push();
        cur = [parts[i]];
      }
    }
  }
  push();
  return pages.length ? pages : [[]];
}

function RenderBlock({ b }) {
  if (b.type === "chapter") {
    return (
      <div className="book-chap">
        <div className="book-chap-no">BÖLÜM {b.no}</div>
        {b.title && <h2 className="book-chap-title">{b.title}</h2>}
      </div>
    );
  }
  return <p className={`book-para${b.cont ? " cont" : ""}`}>{b.text}</p>;
}

export default function KursKitapDetail() {
  const { id } = useParams();
  const [kitap, setKitap] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [status, setStatus] = useState("loading");
  const [pages, setPages] = useState([[]]);
  const [pi, setPi] = useState(0);
  const [fontPx, setFontPx] = useState(19);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [fontsReady, setFontsReady] = useState(false);

  const contentRef = useRef(null);
  const measureRef = useRef(null);

  // veri
  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      try {
        const [k, c] = await Promise.all([getItem("kurs_kitaplari", id), getBookChapters(id)]);
        if (!alive) return;
        setKitap(k);
        setChapters(c);
        setPi(0);
        setStatus("ready");
      } catch {
        if (alive) setStatus("notfound");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // fontlar yüklenince yeniden sayfala
  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  // içerik kutusunun ölçülerini izle
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setDims((d) => (d.w === w && d.h === h ? d : { w, h }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [status]);

  // sayfala
  useLayoutEffect(() => {
    if (status !== "ready" || !measureRef.current || dims.w < 50 || dims.h < 50) return;
    const blocks = buildBlocks(chapters);
    const pg = paginate(blocks, measureRef.current, dims.h, dims.w);
    setPages(pg);
    setPi((p) => Math.min(p, pg.length - 1));
  }, [status, chapters, dims.w, dims.h, fontPx, fontsReady]);

  // klavye okları
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") setPi((p) => Math.min(p + 1, pages.length - 1));
      else if (e.key === "ArrowLeft") setPi((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  // sayfa meta (bölüm başlığı / açılış)
  let curChap = null;
  const meta = pages.map((blocks) => {
    const isStart = blocks[0] && blocks[0].type === "chapter";
    if (isStart) curChap = blocks[0];
    return { isStart, chap: curChap };
  });
  const cur = meta[pi] || { isStart: false, chap: null };
  const shortTitle = (kitap && (kitap.short_title || kitap.title)) || "";

  return (
    <div className="book-reader" style={{ "--book-fs": `${fontPx}px` }}>
      {status === "loading" && <div className="book-info">yükleniyor…</div>}

      {status === "notfound" && (
        <div className="book-info">
          <p>// kitap bulunamadı</p>
          <Link to="/kurs-kitaplari" className="book-back">← kurs kitapları</Link>
        </div>
      )}

      {status === "ready" && (
        <>
          {/* üst ince kontrol şeridi */}
          <div className="book-topbar">
            <Link to="/kurs-kitaplari" className="book-back">← kitaplar</Link>
            <div className="book-fontctl">
              <button onClick={() => setFontPx((f) => Math.max(15, f - 1))} title="Yazıyı küçült">A−</button>
              <button onClick={() => setFontPx((f) => Math.min(26, f + 1))} title="Yazıyı büyült">A+</button>
            </div>
          </div>

          <div className="book-stage">
            <button
              className="book-nav prev"
              onClick={() => setPi((p) => Math.max(p - 1, 0))}
              disabled={pi === 0}
              aria-label="Önceki sayfa"
            >
              ‹
            </button>

            <div className="book-page">
              <div className="book-head">
                {!cur.isStart && cur.chap && (
                  <span>
                    {shortTitle} · BÖLÜM {cur.chap.no}
                  </span>
                )}
              </div>

              <div className="book-page-content" ref={contentRef}>
                {(pages[pi] || []).map((b, i) => (
                  <RenderBlock key={i} b={b} />
                ))}
              </div>

              <div className="book-foot">
                {kitap && kitap.author && <span className="book-author">{kitap.author}</span>}
                <span className="book-pageno">— {pi + 1} —</span>
              </div>
            </div>

            <button
              className="book-nav next"
              onClick={() => setPi((p) => Math.min(p + 1, pages.length - 1))}
              disabled={pi >= pages.length - 1}
              aria-label="Sonraki sayfa"
            >
              ›
            </button>
          </div>

          <div className="book-progress">
            {pi + 1} / {pages.length}
          </div>
        </>
      )}

      {/* ölçüm için gizli kopya (gerçek içerik kutusuyla aynı stiller) */}
      <div className="book-page-content book-measure" ref={measureRef} aria-hidden />
    </div>
  );
}
