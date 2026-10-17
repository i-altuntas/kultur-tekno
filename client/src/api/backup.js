// Yedekleme API'si
import { apiFetch, apiJson, apiSend } from "./http.js";

export async function pickBackupFolder() {
  return apiJson("/api/backup/pick-folder", { method: "POST" }, "Klasör seçilemedi");
}

// Tüm veritabanını JSON dosyası olarak doğrudan tarayıcıdan indir
export async function downloadDatabase() {
  const res = await apiFetch("/api/backup/export", { method: "GET" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Veritabanı indirilemedi");
  }
  const disp = res.headers.get("content-disposition") || "";
  const m = disp.match(/filename="?([^";]+)"?/i);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = m ? m[1] : `kultur-tekno-veritabani-${stamp}.json`;
  const totalRows = Number(res.headers.get("x-total-rows") || 0);
  let counts = {};
  try {
    counts = JSON.parse(res.headers.get("x-table-counts") || "{}");
  } catch {
    /* ignore */
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { ok: true, filename, totalRows, counts };
}

// Yedek data.json'u veritabanına geri yükle (mevcut veri silinir)
export async function restoreDatabase(data) {
  const res = await apiFetch("/api/restore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-KT-CSRF": "1",
    },
    body: JSON.stringify(data),
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 409 && j.atRisk) {
    const err = new Error(j.error || "Eksik tablolar var");
    err.status = 409;
    err.atRisk = j.atRisk;
    throw err;
  }
  if (!res.ok) throw new Error(j.error || "İçe aktarma başarısız");
  return j;
}

export async function runBackup(path, downloadImages = true) {
  return apiSend("/api/backup", "POST", { path, downloadImages }, "Yedekleme başarısız");
}
