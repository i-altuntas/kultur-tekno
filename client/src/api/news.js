// Haberler API'si. Vite proxy /api -> http://localhost:4000
import { apiJson, apiSend } from "./http.js";

export async function getNews(category, { all = false } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "HEPSİ") params.set("category", category);
  if (all) params.set("all", "1");
  const qs = params.toString();
  return apiJson(`/api/news${qs ? `?${qs}` : ""}`, undefined, "Haberler alınamadı");
}

export async function getCategories() {
  return apiJson("/api/categories", undefined, "Kategoriler alınamadı");
}

export async function createNews(data) {
  return apiSend("/api/news", "POST", data, "Haber eklenemedi");
}

export async function setActive(id, is_active) {
  return apiSend(`/api/news/${id}`, "PATCH", { is_active }, "Durum değiştirilemedi");
}

export async function deleteNews(id) {
  return apiJson(`/api/news/${id}`, { method: "DELETE" }, "Haber silinemedi");
}
