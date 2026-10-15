// Genel kaynak yardımcıları (kose_yazilari, egitici_yazilar, arduino_projeleri)

export async function getList(resource, { all = false } = {}) {
  const qs = all ? "?all=1" : "";
  const res = await fetch(`/api/${resource}${qs}`);
  if (!res.ok) throw new Error("Liste alınamadı");
  return res.json();
}

export async function getItem(resource, id) {
  const res = await fetch(`/api/${resource}/${id}`);
  if (!res.ok) throw new Error("Kayıt bulunamadı");
  return res.json();
}

export async function createItem(resource, data) {
  const res = await fetch(`/api/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Eklenemedi");
  }
  return res.json();
}

export async function setItemActive(resource, id, is_active) {
  const res = await fetch(`/api/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error("Durum değiştirilemedi");
  return res.json();
}

export async function deleteItem(resource, id) {
  const res = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Silinemedi");
  return res.json();
}
