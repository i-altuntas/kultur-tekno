// Planlar API'si
import { apiJson, apiSend } from "./http.js";

export async function getPlans(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiJson(`/api/planlar${qs}`, undefined, "Planlar alınamadı");
}

export async function getPlanTable(id) {
  return apiJson(`/api/planlar/${id}/tablo`, undefined, "Plan tablosu alınamadı");
}

export async function importPlan(data) {
  return apiSend("/api/planlar/import", "POST", data, "Plan içe aktarılamadı");
}

export async function deletePlan(id) {
  return apiJson(`/api/planlar/${id}`, { method: "DELETE" }, "Plan silinemedi");
}
