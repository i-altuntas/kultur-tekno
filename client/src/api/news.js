// Haberler API'si. Vite proxy /api -> http://localhost:4000

export async function getNews(category, { all = false } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "HEPSİ") params.set("category", category);
  if (all) params.set("all", "1");
  const qs = params.toString();
  const res = await fetch(`/api/news${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Haberler alınamadı");
  return res.json();
}

export async function getCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Kategoriler alınamadı");
  return res.json();
}

export async function createNews(data) {
  const res = await fetch("/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Haber eklenemedi");
  }
  return res.json();
}

export async function setActive(id, is_active) {
  const res = await fetch(`/api/news/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error("Durum değiştirilemedi");
  return res.json();
}

export async function deleteNews(id) {
  const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Haber silinemedi");
  return res.json();
}
