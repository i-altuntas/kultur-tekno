// Eğitici yazı sayfaları (flipbook), kapak ve JSON import

export async function getPages(yaziId) {
  const res = await fetch(`/api/egitici_yazilar/${yaziId}/sayfalar`);
  if (!res.ok) throw new Error("Sayfalar alınamadı");
  return res.json();
}

export async function createPage(yaziId, data) {
  const res = await fetch(`/api/egitici_yazilar/${yaziId}/sayfalar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Sayfa eklenemedi");
  }
  return res.json();
}

export async function updatePage(pageId, data) {
  const res = await fetch(`/api/egitici_sayfalar/${pageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Sayfa güncellenemedi");
  return res.json();
}

export async function deletePage(pageId) {
  const res = await fetch(`/api/egitici_sayfalar/${pageId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Sayfa silinemedi");
  return res.json();
}

export async function setCover(yaziId, cover_style) {
  const res = await fetch(`/api/egitici_yazilar/${yaziId}/kapak`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cover_style }),
  });
  if (!res.ok) throw new Error("Kapak değiştirilemedi");
  return res.json();
}

export async function importTutorial(data) {
  const res = await fetch("/api/egitici_yazilar/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "İçe aktarma başarısız");
  return j;
}
