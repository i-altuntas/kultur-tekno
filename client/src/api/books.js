// Kurs Kitapları: bölümler + JSON import
// (Kitap üst verisi için genel getList/getItem/createItem/setItemActive/deleteItem kullanılır.)
import { apiJson, apiSend } from "./http.js";

export async function getBookChapters(kitapId) {
  return apiJson(`/api/kurs_kitaplari/${kitapId}/bolumler`, undefined, "Bölümler alınamadı");
}

export async function createBookChapter(kitapId, data) {
  return apiSend(`/api/kurs_kitaplari/${kitapId}/bolumler`, "POST", data, "Bölüm eklenemedi");
}

export async function updateBookChapter(bolumId, data) {
  return apiSend(`/api/kurs_bolumleri/${bolumId}`, "PATCH", data, "Bölüm güncellenemedi");
}

export async function deleteBookChapter(bolumId) {
  return apiJson(`/api/kurs_bolumleri/${bolumId}`, { method: "DELETE" }, "Bölüm silinemedi");
}

export async function updateBook(id, data) {
  return apiSend(`/api/kurs_kitaplari/${id}/duzenle`, "PATCH", data, "Kitap güncellenemedi");
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
  return apiSend(
    `/api/kurs_kitaplari/${id}/kapak-yukle`,
    "POST",
    { filename: file.name, data },
    "Kapak yüklenemedi"
  );
}

export async function importBook(data) {
  return apiSend("/api/kurs_kitaplari/import", "POST", data, "Kitap içe aktarılamadı");
}
