// Yedekleme API'si
import { apiJson, apiSend } from "./http.js";

export async function pickBackupFolder() {
  return apiJson("/api/backup/pick-folder", { method: "POST" }, "Klasör seçilemedi");
}

// Yedek data.json'u veritabanına geri yükle (mevcut veri silinir)
export async function restoreDatabase(data) {
  return apiSend("/api/restore", "POST", data, "İçe aktarma başarısız");
}

export async function runBackup(path, downloadImages = true) {
  return apiSend("/api/backup", "POST", { path, downloadImages }, "Yedekleme başarısız");
}
