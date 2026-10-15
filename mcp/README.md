# Kültür Tekno — MCP Sunucusu

Claude Desktop'ın siteye bağlanıp **haber ekleyip silmesini** sağlar.
Sunucu, yerel Express API'sine (`:4000`) bağlanır; böylece her işlem PostgreSQL'e yazılır
ve site otomatik yenileme ile birkaç saniyede gösterir.

```
Claude Desktop ──stdio/MCP──► mcp/index.js ──HTTP──► API (:4000) ──► PostgreSQL ──► Site (:5173)
```

## Araçlar
| Araç | Açıklama |
|------|----------|
| `haber_ekle` | Yeni haber ekler (başlık, içerik, kategori, özet, kapak görseli). İçeriğe `[img]URL \| açıklama[/img]` ile birden fazla görsel gömülebilir. |
| `haber_listele` | Haberleri listeler; her haberin `[AKTİF]/[PASİF]` durumunu gösterir. `tumu:true` ile pasifler de listelenir. |
| `haber_durum_degistir` | Bir haberi aktif/pasif yapar (`aktif:true/false`). Haber silinmez, yalnızca sitedeki görünürlüğü değişir. |
| `haber_sil` | id ile haberi kalıcı siler. |
| `kose_yazisi_ekle` | Köşe yazısı ekler (yazar, başlık, özet, içerik). |
| `kose_yazilari_listele` | Köşe yazılarını listeler (`tumu:true` → pasifler dahil). |
| `kose_yazisi_sil` | id ile köşe yazısını siler. |
| `egitici_yazi_ekle` | Eğitici yazı ekler (başlık, seviye, özet, içerik). |
| `egitici_yazilar_listele` | Eğitici yazıları listeler (`tumu:true` → pasifler dahil). |
| `egitici_yazi_sil` | id ile eğitici yazıyı siler. |
| `arduino_proje_ekle` | Arduino projesi ekler (başlık, açıklama, `devre_resmi` URL, özet). |
| `arduino_projeleri_listele` | Arduino projelerini listeler (`tumu:true` → pasifler dahil). |
| `arduino_proje_sil` | id ile Arduino projesini siler. |

## Kurulum (yapıldı)
```bash
cd mcp && npm install
```

## Claude Desktop'a bağlama (yapıldı)
`%APPDATA%\Claude\claude_desktop_config.json` dosyasına `citynews` sunucusu eklendi.
Değişikliğin etkili olması için **Claude Desktop'ı tamamen kapatıp yeniden aç**
(sistem tepsisinden Çıkış/Quit — sadece pencereyi kapatmak yetmez).

## Önemli
- Haber eklerken/silerken **API sunucusu açık olmalı**: `cd server && npm start`
- Test: `cd mcp && npm test`

## Kullanım örnekleri (Claude Desktop içinde)
- "Kültür Tekno'ya KÜLTÜR kategorisinde şu haberi ekle: …"
- "Bana bir teknoloji haberi yaz ve siteye ekle."
- "Sitedeki haberleri listele." → "#24 numaralı haberi pasife al." / "… sil."
- "Pasif haberleri de göster." (haber_listele tumu:true)
