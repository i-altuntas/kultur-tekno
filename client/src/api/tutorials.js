// Eğitici yazı sayfaları (flipbook), kapak ve JSON import
import { apiJson, apiSend } from "./http.js";

export async function getPages(yaziId) {
  return apiJson(`/api/egitici_yazilar/${yaziId}/sayfalar`, undefined, "Sayfalar alınamadı");
}

export async function createPage(yaziId, data) {
  return apiSend(`/api/egitici_yazilar/${yaziId}/sayfalar`, "POST", data, "Sayfa eklenemedi");
}

export async function updatePage(pageId, data) {
  return apiSend(`/api/egitici_sayfalar/${pageId}`, "PATCH", data, "Sayfa güncellenemedi");
}

export async function deletePage(pageId) {
  return apiJson(`/api/egitici_sayfalar/${pageId}`, { method: "DELETE" }, "Sayfa silinemedi");
}

export async function setCover(yaziId, cover_style) {
  return apiSend(
    `/api/egitici_yazilar/${yaziId}/kapak`,
    "PATCH",
    { cover_style },
    "Kapak değiştirilemedi"
  );
}

export async function importTutorial(data) {
  return apiSend("/api/egitici_yazilar/import", "POST", data, "İçe aktarma başarısız");
}
