// Genel kaynak yardımcıları (kose_yazilari, egitici_yazilar, arduino_projeleri)
import { apiJson, apiSend } from "./http.js";

export async function getList(resource, { all = false } = {}) {
  const qs = all ? "?all=1" : "";
  return apiJson(`/api/${resource}${qs}`, undefined, "Liste alınamadı");
}

export async function getItem(resource, id) {
  return apiJson(`/api/${resource}/${id}`, undefined, "Kayıt bulunamadı");
}

export async function createItem(resource, data) {
  return apiSend(`/api/${resource}`, "POST", data, "Eklenemedi");
}

export async function setItemActive(resource, id, is_active) {
  return apiSend(`/api/${resource}/${id}`, "PATCH", { is_active }, "Durum değiştirilemedi");
}

export async function deleteItem(resource, id) {
  return apiJson(`/api/${resource}/${id}`, { method: "DELETE" }, "Silinemedi");
}
