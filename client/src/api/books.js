// Kurs Kitapları: bölümler + JSON import
// (Kitap üst verisi için genel getList/getItem/createItem/setItemActive/deleteItem kullanılır.)

export async function getBookChapters(kitapId) {
  const res = await fetch(`/api/kurs_kitaplari/${kitapId}/bolumler`);
  if (!res.ok) throw new Error("Bölümler alınamadı");
  return res.json();
}

export async function createBookChapter(kitapId, data) {
  const res = await fetch(`/api/kurs_kitaplari/${kitapId}/bolumler`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Bölüm eklenemedi");
  }
  return res.json();
}

export async function updateBookChapter(bolumId, data) {
  const res = await fetch(`/api/kurs_bolumleri/${bolumId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Bölüm güncellenemedi");
  return res.json();
}

export async function deleteBookChapter(bolumId) {
  const res = await fetch(`/api/kurs_bolumleri/${bolumId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Bölüm silinemedi");
  return res.json();
}

export async function updateBook(id, data) {
  const res = await fetch(`/api/kurs_kitaplari/${id}/duzenle`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Kitap güncellenemedi");
  return j;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function uploadBookCover(id, file) {
  const data = await fileToDataUrl(file);
  const res = await fetch(`/api/kurs_kitaplari/${id}/kapak-yukle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, data }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Kapak yüklenemedi");
  return j;
}

export async function importBook(data) {
  const res = await fetch("/api/kurs_kitaplari/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Kitap içe aktarılamadı");
  return j;
}
