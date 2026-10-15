// Yedekleme API'si

export async function pickBackupFolder() {
  const res = await fetch("/api/backup/pick-folder", { method: "POST" });
  if (!res.ok) throw new Error("Klasör seçilemedi");
  return res.json();
}

// Yedek data.json'u veritabanına geri yükle (mevcut veri silinir)
export async function restoreDatabase(data) {
  const res = await fetch("/api/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "İçe aktarma başarısız");
  return j;
}

export async function runBackup(path, downloadImages = true) {
  const res = await fetch("/api/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, downloadImages }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Yedekleme başarısız");
  return j;
}
