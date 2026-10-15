// Planlar API'si

export async function getPlans(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fetch(`/api/planlar${qs}`);
  if (!res.ok) throw new Error("Planlar alınamadı");
  return res.json();
}

export async function getPlanTable(id) {
  const res = await fetch(`/api/planlar/${id}/tablo`);
  if (!res.ok) throw new Error("Plan tablosu alınamadı");
  return res.json();
}

export async function importPlan(data) {
  const res = await fetch("/api/planlar/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Plan içe aktarılamadı");
  return j;
}

export async function deletePlan(id) {
  const res = await fetch(`/api/planlar/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Plan silinemedi");
  return res.json();
}
