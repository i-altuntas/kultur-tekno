# Kültür Tekno

Tek sayfa, kültür & teknoloji temalı haber sitesi. **React (Vite) + Express + PostgreSQL.**
Panelden girilen haber otomatik yenileme sayesinde birkaç saniye içinde sitede yayına düşer.
Tasarım alışılmış haber sitelerinden uzak: koyu gri zemin, neon cyan/magenta, terminal/grid estetiği.

```
Proje5_Haberler/
├── server/                  Express API (modüler)
│   ├── index.js             app kurulumu + router'ları bağlar
│   ├── db.js                PostgreSQL havuzu
│   ├── backup.js  init-db.js
│   ├── lib/resource.js      genel CRUD fabrikası
│   └── routes/              news · writings · tutorials · plans · backup
├── client/                  React arayüz (Vite)
│   └── src/
│       ├── api.js           barrel → api/ (news·writings·tutorials·plans·backup)
│       ├── content.jsx      ortak yardımcılar (timeAgo, renderContent)
│       ├── styles.css       @import → styles/ (özellik başına css)
│       └── components/      common · news · columns · tutorials · arduino · plans · admin
├── mcp/                     Claude Desktop için MCP sunucusu (ayrı README)
├── assets/                  Başlatıcı ikonu (kultur-tekno.ico)
├── tools/                   Yardımcı betikler (kısayol/ikon üretimi)
├── launcher.ps1             Grafik başlatıcı arayüz (WinForms)
├── launcher.vbs             Arayüzü konsolsuz açan sarmalayıcı
├── Kultur-Tekno-Baslat.bat  Basit (komut penceresi) başlatıcı — alternatif
└── Kültür Tekno.lnk         Tıklanabilir kısayol (Masaüstünde de var)
```

---

## Özellikler

- **Anlık yayın:** Site her 5 sn'de API'yi yoklar; yeni/değişen haber otomatik görünür ("CANLI" göstergesi + canlı saat).
- **Tasarım:** Gri zemin, neon vurgular, kayan haber şeridi (ticker), grid + scanline efektleri, responsive.
- **Manşet + kart ızgarası:** En yeni haber büyük manşet, diğerleri kart olarak.
- **Kategori filtreleri:** GÜNDEM, TEKNOLOJİ, BİLİM, EKONOMİ, SPOR, KÜLTÜR.
- **Okuma sayfası (`/haber/:id`):** Habere tıklayınca ayrı sayfada açılır. Aşağı kaydırdıkça **sıradaki haberler sayfanın altına eklenir (sonsuz kaydırma)** ve sayfa uzar. Her haberin sonunda ortalanmış **aktif/pasif** düğmesi vardır.
- **Metin içi görsel:** Haber içeriğine `[img]URL | açıklama[/img]` ile birden fazla görsel gömülebilir; panelde "metne görsel ekle" aracı imlecin olduğu yere ekler.
- **Aktif / Pasif:** Haberler pasife alınabilir; pasif haberler sitede ve akışta **gizlenir**, panelde görünür.
- **Pasif Haberler sayfası (`/pasif`):** Ana sayfadaki sağ alt köşe butonu buraya götürür; pasif haberler listelenir, açılıp okunabilir ve sonundaki düğmeyle tekrar yayına alınabilir.
- **Köşe Yazıları (`/kose-yazilari`):** Ayrı bölüm, **editoryal** yapı — yazar vurgulu künye, serif başlıklar, aç/kapa (accordion) ile tam metin. Ana sayfadaki bölüm butonundan erişilir.
- **Eğitici Yazılar (`/egitici-yazilar`):** Kart ızgarası + seviye filtresi (Başlangıç/Orta/İleri). Bir karta tıklanınca **kitap/flipbook okuma sayfası** açılır (`react-pageflip`): yazı sayfa sayfa tutulur, her sayfada **üstte görsel, altta o sayfanın metni**; fare/dokunuş ile sayfa çevrilir. Sayfalar `egitici_sayfalar` tablosunda `page_no` sırasıyla saklanır. Kitabın **kapağı** panelden 10 sanatsal tasarımdan biriyle seçilebilir (sayfalar değişmez).
- **Sesli okuma (flipbook):** Her sayfaya `audio_url` (mp3) eklenebilir — sayfa metninin seslendirmesi. Kitap okuma sayfasında navbarın altındaki bar bir **oynatıcıdır**: oynat/duraklat, hız (1×/1.25×/1.5×/2×), ilerleme çubuğu; **Boşluk** tuşu oynat/duraklat. Aynı anda görünen **iki sayfanın** mp3'leri **sırayla** çalar (örn. 1. sayfa bitince 2. sayfa). Sayfa çevrilince (oynatma açıksa) yeni sayfaların seslendirmesi otomatik devam eder. Ses dosyaları yerel (`client/public/sesler/...`) veya dış URL olabilir.
- **Arduino Projeleri (`/arduino-projeleri`):** Ayrı bölüm — proje kartlarına tıklayınca **ayrı detay sayfasında** (`/arduino-projeleri/:id`) açılır; üstte devre şeması görseli, altında kurulum/çalışma yazısı. Ana sayfadaki bölüm butonundan erişilir.
- **Yönetim paneli (`/panel`, şifresiz):** Dört sekme — **Haberler / Köşe Yazıları / Eğitici Yazılar / Arduino Projeleri**. Her biri için ayrı form (alanlarıyla), aktif/pasif yapma, silme; metne görsel ekleme; durum rozeti ve tarih.
- **Kurs Kitapları (`/kurs-kitaplari`, navbar'dan):** Panel → **Kurs Kitapları** sekmesinden kitap eklenir (manuel form veya JSON — çoklu dosya) ve veri **iki bağlantılı tabloya** yazılır: üst veri+kapak `kurs_kitaplari` (title, short_title, author, description, cover_url), bölümler `kurs_bolumleri` (kitap_id → kurs_kitaplari, bolum_no, title, content/paragraflar). Kitaplar sayfada **kart** olarak gösterilir (Arduino düzeni). Karta tıklayınca **modern klasik kitap okuyucu** açılır: krem kâğıt (#FAF6ED), serif tipografi (EB Garamond), iki yana yaslı metin, geniş kenar boşlukları, ortalanmış sayfa numarası, bölüm açılışları ayrı/ferah; **dinamik sayfalama** (ekran boyutu + A−/A+ yazı boyutuna göre yeniden bölünür), oklarla/klavyeyle sayfa çevirme.
- **Planlar (`/planlar`, navbar'dan):** Panel → **Planlar** sekmesinden JSON ile plan içe aktarılır; veri **iki bağlantılı tabloya** yazılır — üst veri `planlar` (title, description, columns), içerik satırları `plan_satirlari` (plan_id → planlar, data JSONB). Planlar sayfasında **Google benzeri arama** ile plan aranır/seçilir; seçilen planın tablosu altta gösterilir ve **her sütun ayrı ayrı filtrelenebilir**. JSON formatı: `{ title, description, columns:[...], rows:[{sütun:değer,...}] }`.
- **Yedekleme (panelde):** Üstteki yedekleme çubuğundan klasör seç (**Gözat…** ile yerel klasör penceresi açılır ya da yolu elle yaz), **Yedekle**'ye bas. Seçilen yola zaman damgalı bir klasör oluşturulur: `data.json` (tüm tablolar), `database.sql` (`pg_dump`), `gorseller/` (hem dış URL'lerden indirilen hem de `/devreler/...` gibi projedeki yerel görseller kopyalanır) ve `OKU.txt` özeti.
- **Claude Desktop (MCP):** Claude masaüstü uygulaması haber, köşe yazısı, eğitici yazı ve Arduino projesi ekleyebilir/listeleyebilir/silebilir; haberleri aktif/pasif yapabilir (bkz. `mcp/README.md`).
- **Tek tıkla başlatma:** Masaüstündeki ikon, aşamaları canlı gösteren grafik bir başlatıcı açar; hazır olunca siteyi tarayıcıda açar.

---

## Kurulum

### 1) Veritabanı şifresi
`server/.env` dosyasında PostgreSQL şifreni ayarla:
```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=senin_sifren
PGDATABASE=citynews
PORT=4000
```

### 2) Bağımlılıklar
```bash
cd server && npm install
cd ../client && npm install
cd ../mcp && npm install     # (yalnızca Claude Desktop entegrasyonu için)
```

### 3) Veritabanı (tek seferlik)
`citynews` veritabanını, `news` tablosunu ve örnek haberleri oluşturur (idempotent — var olan veriyi silmez, yalnızca tablo boşsa örnek ekler):
```bash
cd server && npm run init-db
```

---

## Çalıştırma

### Kolay yol — ikon
Masaüstündeki **Kültür Tekno** ikonuna çift tıkla. Açılan arayüz:
1. PostgreSQL (5432) bağlantısını kontrol eder (kapalıysa devam için sorar),
2. API'yi (4000) başlatır,
3. Web arayüzünü (5173) başlatır,
4. Hazır olunca **"Tarayıcıda Aç"** düğmesini aktifleştirir.

İkon/kısayol yeniden üretmek için: `powershell -ExecutionPolicy Bypass -File tools\create-shortcut.ps1`

### Elle — iki terminal
```bash
cd server && npm start      # http://localhost:4000
cd client && npm run dev    # http://localhost:5173
```
- **Site:** http://localhost:5173
- **Köşe yazıları:** http://localhost:5173/kose-yazilari
- **Eğitici yazılar:** http://localhost:5173/egitici-yazilar
- **Arduino projeleri:** http://localhost:5173/arduino-projeleri
- **Pasif haberler:** http://localhost:5173/pasif
- **Panel:** http://localhost:5173/panel

---

## Veritabanı şeması

`news` tablosu:

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | SERIAL PK | Haber kimliği |
| title | TEXT | Başlık (zorunlu) |
| summary | TEXT | Kısa özet |
| content | TEXT | İçerik (zorunlu); `[img]URL \| açıklama[/img]` ile görsel |
| category | TEXT | Kategori (varsayılan GÜNDEM) |
| image_url | TEXT | Kapak görseli |
| is_active | BOOLEAN | `true` yayında, `false` pasif (gizli). Varsayılan `true` |
| created_at | TIMESTAMPTZ | Eklenme tarihi/saati (varsayılan `now()`) — filtreleme için kullanılabilir |

`kose_yazilari` tablosu: `id, author, title, summary, content, is_active, created_at`
`egitici_yazilar` tablosu: `id, title, summary, content, level, cover_style, is_active, created_at` (`level`: Başlangıç/Orta/İleri · `cover_style`: kitap kapağı tasarımı — aurora/mesh/sunset/midnight/neon/forest/blueprint/gold/paper/mono)
`egitici_sayfalar` tablosu (kitap sayfaları): `id, yazi_id → egitici_yazilar(id) ON DELETE CASCADE, page_no, content, image_url, audio_url, created_at` (`audio_url`: sayfa metninin mp3 seslendirmesi)
`arduino_projeleri` tablosu: `id, title, summary, content, image_url (devre şeması), is_active, created_at`

---

## API uçları

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/api/news` | Aktif haberleri listeler (en yeni önce) |
| GET | `/api/news?category=TEKNOLOJİ` | Kategoriye göre |
| GET | `/api/news?all=1` | Pasifler dahil tümü (panel/pasif sayfası için) |
| GET | `/api/news/:id` | Tek haber (aktif/pasif fark etmez) |
| GET | `/api/categories` | Aktif haberlerin kategorileri |
| POST | `/api/news` | Haber ekler |
| PATCH | `/api/news/:id` | `{ "is_active": true/false }` — aktif/pasif yapar |
| DELETE | `/api/news/:id` | Haber siler |
| POST | `/api/backup/pick-folder` | Sunucuda yerel klasör seçme penceresi açar |
| POST | `/api/backup` | `{ path, downloadImages }` — DB + görselleri o yola yedekler |

Köşe yazıları ve eğitici yazılar için aynı desende CRUD uçları:

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/api/kose_yazilari` · `?all=1` | Köşe yazıları (aktif / tümü) |
| GET/POST/PATCH/DELETE | `/api/kose_yazilari[/:id]` | Tek kayıt / ekle / aktif-pasif / sil |
| GET | `/api/egitici_yazilar` · `?all=1` | Eğitici yazılar (aktif / tümü) |
| GET/POST/PATCH/DELETE | `/api/egitici_yazilar[/:id]` | Tek kayıt / ekle / aktif-pasif / sil |
| GET/POST | `/api/egitici_yazilar/:id/sayfalar` | Yazının sayfaları (page_no sırayla) / sayfa ekle |
| PATCH/DELETE | `/api/egitici_sayfalar/:pageId` | Sayfa güncelle / sil |
| PATCH | `/api/egitici_yazilar/:id/kapak` | Kitap kapağı tasarımını değiştir (`cover_style`) |
| POST | `/api/egitici_yazilar/import` | JSON ile komple kitap (kapak + sayfalar) içe aktar (tek işlem) |
| GET | `/api/planlar` · `?q=` | Plan listesi / başlığa göre arama |
| GET | `/api/planlar/:id/tablo` | Planın üst verisi + sütunları + satırları |
| POST | `/api/planlar/import` | JSON ile plan içe aktar (planlar + plan_satirlari) |
| DELETE | `/api/planlar/:id` | Plan sil (satırları CASCADE) |
| GET/POST/PATCH/DELETE | `/api/kurs_kitaplari[/:id]` | Kurs kitabı (liste `?all=1` / tek / ekle / aktif-pasif / sil) |
| GET/POST | `/api/kurs_kitaplari/:id/bolumler` | Kitabın bölümleri / bölüm ekle |
| PATCH/DELETE | `/api/kurs_bolumleri/:bolumId` | Bölüm güncelle / sil |
| POST | `/api/kurs_kitaplari/import` | JSON ile kitap (üst veri + bölümler) içe aktar |

**JSON içe aktarma formatı** (Panel → Eğitici Yazılar → *JSON Yükle*):
```json
{
  "title": "Kitap başlığı",
  "level": "Başlangıç",
  "summary": "Kapak açıklaması",
  "content": "Kapak tanıtım metni (opsiyonel)",
  "pages": [
    { "page_no": 1, "image_url": "/devreler/01.png", "audio_url": "/sesler/x/1.mp3", "content": "1. sayfa metni" },
    { "page_no": 2, "image_url": "https://...",       "audio_url": "",              "content": "2. sayfa metni" }
  ]
}
```
`page_no` verilmezse sıraya göre atanır. Görsel yolu yerel (`/devreler/...`) veya dış URL olabilir. Panelde **şablon indir** ile örnek dosya alınabilir.
| GET | `/api/arduino_projeleri` · `?all=1` | Arduino projeleri (aktif / tümü) |
| GET/POST/PATCH/DELETE | `/api/arduino_projeleri[/:id]` | Tek kayıt / ekle / aktif-pasif / sil |

Arayüz geliştirmede `/api/*` istekleri Vite proxy ile `http://localhost:4000`'e yönlenir.

---

## Notlar
- Panel şifresizdir — yalnızca yerel/kişisel kullanım içindir.
- Uygulama kodu asla toplu silme yapmaz; `DELETE` yalnızca tek id siler, `init-db` yalnızca boş tabloya örnek ekler.
- Claude Desktop entegrasyonu için ayrıntılar: [`mcp/README.md`](mcp/README.md).
