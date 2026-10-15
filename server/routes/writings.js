import { registerResource } from "../lib/resource.js";

// Genel CRUD ile yönetilen kaynaklar: köşe yazıları, eğitici yazılar, arduino projeleri
export default function writingsRoutes(app) {
  registerResource(app, "kose_yazilari", ["author", "title", "summary", "content"], ["title", "content"], "Köşe yazısı");
  registerResource(app, "egitici_yazilar", ["title", "summary", "content", "level", "cover_style"], ["title", "content"], "Eğitici yazı");
  registerResource(app, "arduino_projeleri", ["title", "summary", "content", "image_url"], ["title", "content"], "Arduino projesi");
}
