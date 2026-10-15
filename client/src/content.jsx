// Ortak yardımcılar: tarih ve içerik (gömülü görselli) render'ı.

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

// Metni paragraf + gömülü görsel olarak işler.
// [img]URL[/img] veya [img]URL | açıklama[/img] satırları görsele dönüşür.
export function renderContent(text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const m = t.match(/^\[img\]\s*(\S+?)\s*(?:\|\s*(.+?))?\s*\[\/img\]$/i);
    if (m) {
      out.push(
        <figure key={i} className="content-fig">
          <img src={m[1]} alt={m[2] || ""} loading="lazy" />
          {m[2] && <figcaption>{m[2]}</figcaption>}
        </figure>
      );
    } else {
      out.push(<p key={i}>{t}</p>);
    }
  });
  return out;
}
