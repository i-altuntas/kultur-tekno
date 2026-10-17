# Kültür Tekno — İçerik Üretim Standartları

Bu belge **içerik üretmek için** yazılmıştır. Bir yapay zekâ modeli ya da editör,
yeni bir haber, köşe yazısı, eğitici yazı, Arduino projesi, plan veya kurs kitabı
hazırlarken bu belgeyi açar, ilgili bölümün **şablonunu ve ölçülerini** uygular.

## Bu belge nasıl kullanılır

1. Üreteceğin içerik türünün bölümüne git (§3 haber, §4 köşe, §5 eğitici, §6 Arduino, §7 plan, §8 kitap).
2. O bölümdeki **zorunlu yapı iskeletini** sırayla doldur. Bölüm atlamak kalite düşürür.
3. **Uzunluk hedeflerini** tut. Bu projede kısa içerik eksik içerik sayılır.
4. Bölüm sonundaki **örnek şablonu** model al.
5. §9'daki teslim kontrol listesinden geçir.

**Belgenin dayanağı:** Ölçüler uydurulmadı. Veritabanındaki 95.000+ kayıt ölçüldü,
sitenin render kodu (`client/src/content.jsx`, `KursKitapDetail.jsx`) okundu ve
mevcut **en iyi içeriklerin** yapısı iskelet olarak çıkarıldı. Yani hedefler,
projenin kendi en iyi işinin seviyesidir.

Ölçüm tarihi: 2026-10-17

---

## 1. Beş temel ilke

Her içerik türü için geçerli, pazarlanabilir olmayan asıl kalite ölçütleri.

### 1.1 Detaylı olacak

Yüzeysel içerik üretilmez. Bir konu ele alınıyorsa okur o konuyu **başka bir
kaynağa gitmeye ihtiyaç duymayacak** şekilde öğrenmeli.

- Her iddia somutlaştırılır: sayı, tarih, kurum adı, model adı, ölçü birimi.
- "Hızlı", "çok", "büyük ölçüde" gibi belirsiz nitelemeler yerine **ölçü** verilir:
  "%37 daha hızlı", "250 milyon euro", "32 °C".
- Bir mekanizma anlatılıyorsa **neden** öyle çalıştığı da yazılır, sadece **ne**
  olduğu değil.
- Konunun sınırları da söylenir: neyi kapsamıyor, nerede işe yaramaz.

### 1.2 Güncel olacak

- Teknoloji/bilim içeriğinde **sürüm numarası, tarih ve güncel durum** belirtilir.
- Bir bilgi zamana bağlıysa tarihi yazılır: "Haziran 2025'te", "sürüm 27 ile".
- Eski/geçersiz uygulamalar "artık önerilmiyor" notuyla ayırt edilir.
- Fiyat, bağlantı ve ürün adı gibi çürüyebilen bilgiler verilirken **ne zaman
  geçerli olduğu** yazılır.
- Tarihsel metin (çeviri, arşiv) yayımlanıyorsa **özgün tarihi künyede** verilir
  ve güncel bağlamı editör notunda açıklanır.

### 1.3 Uygulanabilir olacak

Okur içeriği okuduktan sonra **bir şey yapabilmeli**.

- Arduino/eğitici içerikte: parça listesi adet ve değerleriyle, pin bağlantıları
  tek tek, çalışan tam kod, kurulum adımları.
- Haber/köşe yazısında: okurun bundan ne çıkaracağı, nasıl etkilendiği, ne
  yapması gerektiği.
- Adımlar **sırayla ve atlamadan** verilir. "Gerisi kolay" denmez.
- Hata durumları yazılır: ne ters gidebilir, nasıl anlaşılır, nasıl düzeltilir.
- Verilen kod/komut **denenmiş ve çalışıyor** olmalı.

### 1.4 Eğitici olacak

- Terim ilk kullanıldığında **parantezle açıklanır**: "FPV (First Person View),
  birinci şahıs görüşü demektir".
- Bilinenden bilinmeyene gidilir; okurun ön bilgisi varsayılmaz.
- Kavram **benzetmeyle** desteklenir, ama benzetme gerçeğin yerine geçmez.
- Yanlış bilinen noktalar açıkça düzeltilir ("yaygın inanışın aksine…").
- Okur yönlendirilir: sonraki adım, ileri okuma, ilgili içerik.
- Öğretici içerikte **güvenlik ve etik uyarıları** atlanmaz.

### 1.5 Uzun ve doyurucu olacak

Bu projede uzunluk bir erdemdir — **dolgu olmadığı sürece.**

- Alt sınırların altına düşmek: içerik yayına alınmaz.
- Uzunluk tekrar ederek değil, **yeni bilgi ekleyerek** sağlanır.
- Her paragraf okura yeni bir şey vermeli. Vermiyorsa silinir.
- Konu dar geliyorsa daha derine inilir (tarihçe, karşılaştırma, mekanizma,
  sonuçlar, eleştiriler), konu şişirilmez.

> **Dolgu yasağı (mutlak):** "Sonuç olarak özetlemek gerekirse", "bu yazıda
> gördüğümüz gibi", "teknoloji hızla gelişiyor", "bir dil modeli olarak" gibi
> hiçbir bilgi taşımayan cümleler kullanılmaz. Yapay zekâ kalıpları temizlenir.

---

## 2. Tüm içerikte geçerli biçim kuralları

### 2.1 Seviye sistemi

| Seviye | Anlamı |
|--------|--------|
| **S** | Zorunlu. Uymayan içerik **yayına alınmaz**. |
| **A** | Üst seviye hedef. Yeni üretilen her içerik bunu karşılamalı. |
| **B** | Tolere edilir, ilk düzenlemede A'ya çıkarılmalı. |
| **C** | Kusurlu. Yayında bulunmamalı. |

### 2.2 Paragraf ve satır düzeni — ÖNEMLİ

Site iki farklı render kuralı kullanır. **Karıştırılırsa içerik bozuk görünür.**

| İçerik türü | Paragraf ayracı | Kaynak |
|-------------|-----------------|--------|
| `news`, `kose_yazilari`, `arduino_projeleri`, `egitici_sayfalar` | **Tek satır sonu** (`\n`) | `content.jsx` → `text.split("\n")`, her satır bir `<p>` |
| `kurs_bolumleri` | **Çift satır sonu** (`\n\n`) | `KursKitapDetail.jsx` → `split(/\n{2,}/)` |

| Kural | Seviye | Açıklama |
|-------|--------|----------|
| Doğru ayraç | **S** | Yukarıdaki tabloya uyulur. Haberde `\n\n` kullanmak boş paragraf üretmez ama gereksizdir; kitapta tek `\n` kullanmak **tüm bölümü tek paragraf yapar**. |
| Tek blok yasağı | **S** | Uzun metin tek satırda yazılmaz. |
| Paragraf uzunluğu | **A** | 2–6 cümle. Ekranda okunabilir bloklar. |
| Boş satır | **A** | Render boş satırları atar (`if (!t) return`); görsel etki için kullanılmaz. |

### 2.3 Gömülü görsel etiketi

Yalnızca bu biçim desteklenir (`content.jsx`):

```text
[img]/gorseller/ornek.webp | Görselin açıklaması[/img]
```

| Kural | Seviye | Açıklama |
|-------|--------|----------|
| Kendi satırında | **S** | Etiket **tek başına bir satırda** olmalı. Paragraf içine gömülürse düz metin olarak görünür. |
| Tam kalıp | **S** | `[img]URL[/img]` veya `[img]URL \| açıklama[/img]`. Regex tam eşleşme arar. |
| URL'de boşluk yok | **S** | URL kısmı `\S+` ile eşleşir; boşluk içeren dosya adı çalışmaz. |
| Açıklama dolu | **A** | `\|` sonrası açıklama yazılır → `<figcaption>` olur ve `alt` metni olarak erişilebilirliği sağlar. Boş bırakılırsa `alt=""` olur. |
| Açıklama niteliği | **A** | "Resim 1" değil; görselde **ne görüldüğü** ve varsa kaynağı yazılır. |

### 2.4 Dil ve yazım

| Kural | Seviye | Açıklama |
|-------|--------|----------|
| Türkçe karakter | **S** | `ş ğ ı İ ö ç ü` doğru kullanılır. `ogrenme`, `istanbul` kabul edilmez. |
| İmla | **S** | Cümleler noktalama ile biter; yazım denetimi yapılır. |
| Tipografi | **A** | Türkçe tırnak (`" "`) ve doğru kesme (`'`) kullanılır. |
| Sayı biçimi | **A** | Türkçe kuralı: ondalık virgül (`7,8 milyon`), binlik nokta (`600 bin`, `94.617`). |
| Birim | **A** | Sayı ile birim arasına boşluk: `220 Ω`, `32 °C`, `5 V`, `250 mm`. |
| Bağırma yasağı | **S** | TAMAMI BÜYÜK HARF yazılmaz (kategori adı hariç). |
| Tık tuzağı yasağı | **S** | "ŞOK", "inanılmaz", "bunu görmelisiniz" kullanılmaz. |
| Terim tutarlılığı | **A** | Aynı kavram metin boyunca aynı terimle anılır. |

### 2.5 Kaynak, künye ve dürüstlük

| Kural | Seviye | Açıklama |
|-------|--------|----------|
| Kaynak gösterimi | **S** | Dış veriye dayanan iddialarda kaynak kurum/kuruluş **metinde adıyla** anılır. |
| Yapay zekâ künyesi | **S** | İçerik yapay zekâ ile hazırlandıysa bu **ilk satırda belirtilir** (mevcut uygulama: "Bu yazı Claude (yapay zekâ) tarafından … hazırlanmıştır"). |
| Uydurma yasağı | **S** | Doğrulanmamış sayı, tarih, alıntı veya kaynak **üretilmez**. Bilinmiyorsa yazılmaz. |
| Telif | **S** | Başkasının metni/görseli izinsiz kullanılmaz. Çeviride özgün yazar belirtilir. |
| Görsel kaynağı | **A** | Görselin lisansı ve sahibi yazılır: "Lucasbosch, CC BY-SA 4.0, Wikimedia Commons". |
| Yasal/etik sınır | **S** | Zarar verici uygulama bilgisi verilmez; farkındalık içeriği bunu açıkça belirtir. |

### 2.6 Teknik alan kuralları (tüm tablolar)

| Alan | Seviye | Kural |
|------|--------|-------|
| `id` | **S** | Elle atanmaz; `SERIAL` üretir. |
| `created_at` | **S** | Elle girilmez; `now()` yazar. İleri tarihli kayıt olmaz. |
| `is_active` | **S** | `true`/`false` (metin veya `NULL` değil). `true` = yayında. Tüm **S** kuralları karşılanmadan `true` yapılmaz. Tamamlanmamış içerik silinmez, `false` ile taslakta bekletilir. |
| Boş/sahte veri | **S** | `"-"`, `"test"`, `"lorem ipsum"`, `"xxx"` girilmez. |
| Boşluk | **S** | Metin başında/sonunda boşluk, metin içinde çift boşluk olmaz. |
| HTML/script | **S** | `<script>`, `<iframe>`, `onclick=` gömülmez. Yalnızca `[img]` etiketi. |
| Başlık tekrarı | **S** | Aynı tabloda birebir aynı başlık iki kez olmaz. |

### 2.7 Görsel ve ses dosyaları

| Kural | Seviye | Açıklama |
|-------|--------|----------|
| Yol biçimi | **S** | Yerel dosya `/klasor/dosya.png` — kök eğik çizgiyle başlar. |
| Dosya var | **S** | `client/public/` altında fiziksel olarak bulunmalı. Kırık görsel yayına alınmaz. |
| Dosya adı | **A** | Küçük harf, Türkçe karaktersiz, `-` ile ayrılmış: `12-matek-gps-telemetri.png`. |
| Numaralı ön ek | **A** | Seri içerikte `01-`, `02-`. |
| Biçim | **A** | Fotoğraf → `.webp`/`.jpg`; şema/çizim → `.png`; ses → `.mp3`. |
| Çözünürlük | **A** | Kapak/liste görseli ≥ 1000 px genişlik; şemada metin okunabilir. |
| Boyut | **A** | Görsel ≤ 400 KB (kapak ≤ 800 KB), ses ≤ 5 MB. |
| Yerel tercih | **A** | Harici `http(s)://` görsel link çürümesine açıktır; yerel kopya tercih edilir (bkz. §10 risk notu). |

---

## 3. `news` — Haber üretimi

Sitenin ana akışı. En çok okunan tür, dolayısıyla en yüksek standart.

### 3.1 Zorunlu yapı iskeleti

Haber metni (`content`) şu sırayı izler:

1. **Künye satırı** (gerekiyorsa) — tür, dosya/seri adı, yapay zekâ ve kaynak
   bildirimi, kapsam sınırı. *Mevcut uygulamadan: "Bilgi yazısı · Deep Web
   Dosyası. Bu yazı Claude (yapay zekâ) tarafından, aşağıdaki kaynaklardan
   derlenerek eğitim ve farkındalık amacıyla hazırlanmıştır. Yasa dışı sitelere
   erişim ya da kullanım bilgisi içermez."*
2. **Giriş paragrafı (ters piramit)** — "ne oldu" sorusunu tek başına cevaplar.
   Okur yalnızca bunu okusa bile haberi öğrenmiş olmalı.
3. **Somut çekirdek olay** — tarih, kurum, sayı, yer ile birlikte.
4. **Mekanizma / nasıl** — olayın nasıl gerçekleştiği, teknik işleyiş.
5. **Bağlam ve tarihçe** — bu olay neyin devamı, daha önce ne olmuştu.
6. **Karşılaştırma veya örnekler** — benzer vakalar, rakipler, önceki sürümler.
7. **Sonuçlar / okura etkisi** — bu bilgi okurun neyini değiştirir.
8. **Sınırlar ve bilinmeyenler** — neyin doğrulanmadığı, açık sorular.

### 3.2 Alan ölçüleri

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `title` | TEXT NOT NULL | Uzunluk | **A** | **55–120 karakter.** Haberin tamamı başlıktan anlaşılmalı. |
| | | Alt sınır | **C** | 45 karakter altı: yetersiz başlık. |
| | | Yapı | **A** | İki bölümlü: `Ana olay: ayrıntı`. Örn. *"Java 27 çıktı: Kuantum sonrası şifreleme varsayılan, G1 artık her yerde çöp toplayıcı"* |
| | | Bilgi yoğunluğu | **A** | Özne + olay + sonuç. Sürüm/sayı/tarih başlığa girer. |
| | | Noktalama | **S** | Nokta ile bitmez. Soru/ünlem anlam gerektiriyorsa kullanılır. |
| `summary` | TEXT NULL | Doluluk | **S** | Şema `NULL` izinli olsa da **zorunlu**: liste kartında görünür, boşsa kart eksik durur. |
| | | Uzunluk | **A** | **140–200 karakter.** Tek, tam, kendi başına anlaşılır cümle(ler). |
| | | Aşım | **B** | 200–240 karakter: kart düzenini zorlar, kısaltılmalı. |
| | | İçerik | **S** | Başlığın kopyası olamaz; **yeni bilgi** vermeli (sayı, isim, sonuç). |
| | | Bitiş | **A** | Nokta ile biter. "Detaylar haberde" gibi boş vaat yasak (**S**). |
| `content` | TEXT NOT NULL | **Uzunluk** | **A** | **3.000–7.000 karakter.** Derinlikli haber-analiz. |
| | | Alt sınır | **S** | **1.500 karakter altı yayına alınmaz.** |
| | | Kapsamlı dosya | **A** | Seri/dosya yazılarında 4.000–8.000 karakter. |
| | | Paragraf | **S** | §2.2 — **tek satır sonu**. |
| | | Paragraf sayısı | **A** | En az 8–12 paragraf. |
| | | Doğrulanabilirlik | **S** | Tarih, kurum/kişi adı ve sayısal veri içerir. |
| | | Kaynak | **S** | İddiaların kaynağı metinde anılır. |
| `category` | TEXT NOT NULL | Kapalı liste | **S** | Yalnızca: `GÜNDEM`, `TEKNOLOJİ`, `BİLİM`, `EKONOMİ`, `SPOR`, `KÜLTÜR`. |
| | | Biçim | **S** | Tamamı büyük, Türkçe karakterli. Yeni kategori uydurulmaz. |
| | | Panel uyumu | **S** | `Admin.jsx` → `CATEGORIES` listesiyle birebir aynı. |
| | | Doğru eşleşme | **A** | Şüphede `GÜNDEM`. |
| `image_url` | TEXT NULL | Doluluk | **S** | Pratikte zorunlu — kart ve okuma sayfası görselsiz eksik görünür. |
| | | Erişim | **S** | Bağlantı çalışır durumda (404 görsel yayına alınmaz). |
| | | Konu uyumu | **A** | Haberin konusuyla ilgili; dekoratif görsel konmaz. |
| | | Oran | **A** | Yatay ~16:9, ≥ 1000 px. |
| | | Telif | **S** | Kullanım hakkı olan görsel. |

### 3.3 Haber şablonu

```text
Bilgi yazısı · [Seri adı]. Bu yazı [model] (yapay zekâ) tarafından, kamuya açık
kaynaklardan derlenerek eğitim amacıyla hazırlanmıştır. [Kapsam sınırı.]

[Giriş: Ne oldu? Tek paragrafta tam cevap — özne, olay, tarih, sonuç.]

[Çekirdek olay: sayılarla. "Haziran 2025'te … operasyonunda yaklaşık 300 polis
görev aldı, 7,8 milyon euroluk varlığa el konuldu."]

[Mekanizma: Bu nasıl oldu? Teknik işleyiş, adım adım.]

[Bağlam: Bu neyin devamı? Daha önce ne olmuştu? Tarihçe.]

[Karşılaştırma: Benzer vakalar, önceki sürümler, rakip yaklaşımlar.]

[Okura etkisi: Bu bilgi ne değiştiriyor? Ne yapmalı?]

[Sınırlar: Neler doğrulanmadı, hangi sorular açık?]
```

---

## 4. `kose_yazilari` — Köşe yazısı üretimi

İmzalı, tez savunan yorum metni. Haberden farkı: **bir iddia geliştirir.**

### 4.1 Zorunlu yapı iskeleti

1. **Editör notu** (çeviri/arşiv metinlerinde **zorunlu**) — yazarın kim olduğu,
   metnin özgün tarihi ve yeri, bugünkü önemi. *Mevcut uygulamadan: "Editörün
   notu: … İngiliz yazar Samuel Butler (1835-1902) … 13 Haziran 1863'te
   Christchurch'te yayımlanan The Press gazetesine … Butler'ın alaycı üslubunu
   koruyarak tamamını Türkçeye çevirdik."*
2. **Tez** — yazının savunduğu iddia, ilk paragraflarda net biçimde.
3. **Gerekçeler** — her biri ayrı paragrafta, kanıt/örnek/veriyle.
4. **Karşı görüş** — en güçlü itiraz dürüstçe aktarılır ve yanıtlanır.
5. **Sonuç/çıkarım** — tezin ne anlama geldiği, okura ne düşündürdüğü.

### 4.2 Alan ölçüleri

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `author` | TEXT NOT NULL | Doluluk | **S** | Gerçek ad. Varsayılan `'Editör'`a bırakılmaz. |
| | | Biçim | **S** | `Ad Soyad`, her kelime büyük harfle. Rumuz (`admin`, `ek`) kullanılmaz. |
| | | Tutarlılık | **S** | Aynı yazar her yazıda **birebir aynı** yazılır (`Erdem KISMET` ↔ `Erdem Kısmet` karışmaz). |
| | | Çeviri künyesi | **S** | `Özgün Yazar (çeviri: Çevirmen)` — örn. `Nikola Tesla (çeviri: Claude)`. |
| | | Telif | **S** | Başkasının metni yazarı gizlenerek yayımlanmaz. |
| `title` | TEXT NOT NULL | Uzunluk | **A** | **30–105 karakter.** |
| | | Üslup | **A** | İddia veya soru taşır: *"Şehirler neden yavaşlamalı?"*. Tarihsel metinde özgün başlık + yıl: *"Makineler Arasında Darwin (1863)"*. |
| `summary` | TEXT NULL | Doluluk | **S** | Pratikte zorunlu (liste kartı). |
| | | Uzunluk | **A** | **140–230 karakter.** |
| | | İçerik | **A** | Yazının **tezini** özetler, konusunu değil. Neden okunmaya değer olduğunu söyler. |
| `content` | TEXT NOT NULL | **Uzunluk** | **A** | **5.000–12.000 karakter.** Köşe yazısı bir tez geliştirir. |
| | | Alt sınır | **S** | **3.000 karakter altı yayına alınmaz.** |
| | | Alt sınır | **C** | 1.000 karakter altı: tohum/örnek veri seviyesi. |
| | | Paragraf | **S** | §2.2 — **tek satır sonu**. |
| | | Yapı | **S** | Tez → gerekçe → karşı görüş → sonuç akışı kurulur. |
| | | Üslup | **A** | Birinci kişi serbest; **her iddia gerekçelendirilir**. |
| | | Ayrım | **S** | Haber metni köşe yazısı olarak girilmez; tersi de geçerli. |
| | | Çeviri sadakati | **S** | Çeviride özgün üslup korunur, metin kısaltılmaz/sansürlenmez. |

---

## 5. `egitici_yazilar` + `egitici_sayfalar` — Eğitici yazı üretimi

Sayfa sayfa okunan (flipbook) eğitim içeriği. **İki tabloya birlikte** yazılır:
künye `egitici_yazilar`da, asıl metin `egitici_sayfalar`da.

### 5.1 `egitici_yazilar` (künye)

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `title` | TEXT NOT NULL | Uzunluk | **A** | **25–65 karakter.** Konu + kapsam: *"Arduino'ya Giriş: İlk Devre"*. |
| | | Üslup | **A** | Öğretici ve nötr; haber dili kullanılmaz. |
| `summary` | TEXT NULL | Doluluk | **S** | Pratikte zorunlu (liste kartı). |
| | | Uzunluk | **A** | **80–170 karakter.** |
| | | İçerik | **A** | **Kazanım odaklı**: okur ne öğrenecek — "breadboard, LED ve ilk kod". |
| `content` | TEXT NOT NULL | **Rolü** | **S** | Bu alan **tam metin değildir**; kapak/tanıtım metnidir. Asıl içerik sayfalardadır. |
| | | Uzunluk | **A** | **150–450 karakter.** Kapsam + nasıl okunacağı. |
| | | Tutarlılık | **S** | Sayfalardaki metin buraya kopyalanmaz. |
| `level` | TEXT NOT NULL | Kapalı liste | **S** | Yalnızca: `Başlangıç`, `Orta`, `İleri`. |
| | | Biçim | **S** | İlk harf büyük, Türkçe karakterli (`Baslangic` ✗). |
| | | Doğruluk | **A** | Ön bilgi gerektiren içerik `Başlangıç` işaretlenmez. |
| `cover_style` | TEXT NOT NULL | Kapalı liste | **S** | `covers.css`'te tanımlı tema: `aurora`, `blueprint`, `sci2`, `goth1`. |
| | | Geçerlilik | **S** | CSS'te karşılığı olmayan ad yazılmaz — kapak bozulur. |
| | | Çeşitlilik | **A** | Yan yana listelenen yazılarda tema tekrarlanmaz. Belirsizse `aurora`. |
| `is_active` | BOOLEAN | Yayın şartı | **S** | §2.6 + **en az 8 geçerli sayfa** olmadan `true` yapılmaz. |

### 5.2 `egitici_sayfalar` (asıl içerik)

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `yazi_id` | INTEGER NOT NULL | Bütünlük | **S** | Var olan `egitici_yazilar.id` (FK, `ON DELETE CASCADE`). Yetim satır olmaz. |
| `page_no` | INTEGER NOT NULL | Aralık | **S** | `1`'den başlar, pozitif. |
| | | Süreklilik | **S** | **1..N kesintisiz**; atlama (1,2,4) veya tekrar (2,2) olmaz. |
| | | Sıra anlamı | **S** | Sayfa sırası öğrenme sırasıdır; önkoşul bilgi sonraya bırakılmaz. |
| `content` | TEXT NULL | Doluluk | **S** | Metinsiz **ve** görselsiz sayfa olamaz. |
| | | **Uzunluk** | **A** | **600–900 karakter.** Tek ekranda okunur, **tek konuyu** tam anlatır. |
| | | Alt sınır | **C** | 300 karakter altı: yetersiz sayfa. |
| | | Üst sınır | **C** | 1.400 karakter üstü: ekrana sığmaz. |
| | | Bütünlük | **S** | Sayfa cümle ortasında kesilmez; kendi içinde tamamlanır. |
| | | Yapı | **A** | 3–5 paragraf (§2.2 tek satır sonu). Terim ilk geçtiğinde parantezle açıklanır. |
| | | Görsel künyesi | **A** | Sayfa sonunda kaynak satırı: *"Görsel: Lucasbosch, CC BY-SA 4.0, Wikimedia Commons."* |
| `image_url` | TEXT NULL | Doluluk | **A** | Her sayfada hedeflenir; görsel gerektiren konuda **zorunlu** (**S**). |
| | | Dosya varlığı | **S** | §2.7. |
| | | İlgi | **A** | O sayfanın konusunu gösterir; genel resim konmaz. |
| `audio_url` | TEXT NULL | Zorunluluk | **B** | İsteğe bağlı seslendirme. |
| | | Biçim | **S** | `.mp3`, yol geçerli, dosya mevcut. |
| | | Eşleşme | **S** | O sayfanın metnini okur; başka sayfanın sesi bağlanmaz. |
| | | Tutarlılık | **A** | Bir yazıda seslendirme varsa **tüm** sayfalara eklenir; yarım bırakılmaz. |

### 5.3 Sayfa sayısı ve yazı planı

| Ölçüt | Seviye | Standart |
|-------|--------|----------|
| Alt sınır | **S** | Yayına alınan yazı **en az 8 sayfa**. |
| Hedef | **A** | **15–25 sayfa.** Doyurucu, konuyu bölümlere ayırabilen uzunluk. |
| Üst sınır | **B** | 30+ sayfa: iki ayrı yazıya bölünmesi önerilir. |
| Toplam metin | **A** | 15 sayfa × 750 karakter ≈ **11.000+ karakter** gövde metni. |

**Sayfa akışı (önerilen):** 1) Konuya giriş ve terim tanımı · 2) Genel resim /
parça listesi · 3–N) Her sayfada **tek bir** alt konu, sırayla derinleşerek ·
Son sayfalar) Uygulama, sık hatalar, sonraki adımlar.

### 5.4 Eğitici sayfa şablonu (mevcut en iyi içerikten)

```text
[Terim tanımı:] FPV (First Person View), "birinci şahıs görüşü" demektir: Pilot,
dronun burnundaki kameranın gördüğünü gözlüğünden anlık olarak izler.

[Ayırt edici bilgi:] Hazır kameralı dronların aksine FPV dronlar çoğunlukla parça
parça seçilip toplanır. Bu yüzden FPV pilotları birer elektronik ustasıdır.

[Somut liste / ölçü:] Bir FPV dronun temel parçaları: gövde (frame), 4 fırçasız
motor, pervaneler, ESC (motor sürücü), uçuş kontrolcüsü, LiPo batarya…

[Yönlendirme:] Bu kitapta her parçayı sırayla inceleyeceğiz. Resimde bir 5 inç
FPV dron ve onu oluşturan parçalar görülüyor.

Görsel: [Sahip], [Lisans], [Kaynak].
```

---

## 6. `arduino_projeleri` — Arduino projesi üretimi

Projenin **en yüksek kaliteli** türü (ortalama 9.382 karakter). Üst veri yoktur;
her şey `content` içindedir. **Tam uygulanabilirlik şarttır.**

### 6.1 Zorunlu bölüm iskeleti

Mevcut en iyi projeden çıkarılan 11 bölüm. **Sırası ve tamamı korunur:**

| # | Bölüm | Seviye | İçerik |
|---|-------|--------|--------|
| 1 | **Künye satırı** | **S** | `Arduino Proje NN · Seviye: [Başlangıç/Orta/İleri] · Tahmini süre: N saat · Malzeme kaynağı · Hazırlayan` |
| 2 | **Projenin amacı** | **S** | Sistem ne yapıyor, neyi ölçüyor, neyi kontrol ediyor. Önceki projelerle bağı. |
| 3 | **Malzemeler** | **S** | Madde madde, **adet + değer + model** ile. Satın alma bağlantısı varsa eklenir. |
| 4 | **Kontrol stratejisi** | **A** | Sistemin karar mantığı: eşikler, oransal davranış, öncelik kuralları — **sayısal** olarak. |
| 5 | **Bağlantı tablosu** | **S** | Hangi bacak → hangi pin. Tek tek. "Şemaya bakın" yeterli değil. |
| 6 | **Kalibrasyon** | **A** | Sensör/modül farklılıkları nasıl ayarlanır, hangi değer nasıl ölçülür. |
| 7 | **Gerekli kütüphaneler** | **S** | Tam kütüphane adı + yazarı: *"DHT sensor library (Adafruit)"*. |
| 8 | **Kod** | **S** | **Çalışan tam kod.** `void setup()` / `void loop()`, pin tanımları sabit olarak başta, satırlar Türkçe yorumlu. |
| 9 | **Sık yapılan hatalar** | **S** | Belirti → sebep → çözüm. En az 3 madde. |
| 10 | **Kendiniz geliştirin** | **A** | Numaralı 3–4 genişletme fikri, somut parça önerisiyle. |
| 11 | **Seri hakkında / Görsel künyesi** | **A** | Serideki yeri ve görselin kaynağı/lisansı. |

### 6.2 Alan ölçüleri

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `title` | TEXT NOT NULL | Uzunluk | **A** | **40–90 karakter.** |
| | | Biçim | **A** | `Proje NN: [bileşen] ile [işlev] ([ayrıntı])`. Örn. *"Proje 11: Akıllı sera otomasyonu (sıcaklık, nem ve ışığa göre karar veren sistem)"* |
| `summary` | TEXT NULL | Doluluk | **S** | Pratikte zorunlu (liste kartı). |
| | | Uzunluk | **A** | **100–200 karakter.** Devrenin ne yaptığını tek cümlede söyler. |
| `content` | TEXT NOT NULL | **Uzunluk** | **A** | **8.000–13.000 karakter.** 11 bölüm eksiksiz doldurulduğunda bu aralığa düşer. |
| | | Alt sınır | **S** | **4.000 karakter altı yayına alınmaz.** |
| | | Parça değerleri | **S** | Değer belirtilmeyen parça kabul edilmez: `220 Ω direnç`, `10 kΩ`, `DHT22`. |
| | | Kod | **S** | Sözde kod (pseudocode) **yeterli değildir**. Derlenip çalışan kod verilir. |
| | | Mühendislik gerekçesi | **A** | Neden böyle çalıştığı açıklanır: gerilim bölücü, trig/echo süresi, oransal kontrolün neden daha kararlı olduğu. |
| | | Güvenlik | **S** | Isınma, ters kutuplama, besleme sınırı, **şebeke gerilimi** uyarıları yazılır ("220 V cihazlarla çalışmayın"). |
| | | Doğrulama | **S** | Devre fiilen kurulabilir ve çalışır olmalı. Denenmemiş devre yayına alınmaz. |
| | | Seviye tutarlılığı | **A** | Künyedeki seviye, kullanılan kavramlarla uyumlu olmalı. |
| `image_url` | TEXT NULL | Doluluk | **S** | **Zorunlu** — devre şeması olmadan proje anlaşılmaz. |
| | | Kaynak | **A** | Yerel: `/devreler/NN-proje-adi.png`. |
| | | Okunabilirlik | **S** | Şemadaki pin adları ve bileşen değerleri okunabilir. |
| | | Eşleşme | **S** | Şema, parça listesi ve kod **birebir tutarlı**. Şemada direnç varsa metinde de olmalı. |
| `is_active` | BOOLEAN | Yayın şartı | **S** | 11 bölümün tamamı + şema mevcut olmadan `true` yapılmaz. |

---

## 7. `planlar` + `plan_satirlari` — Plan aktarımı

MEB kurs planları. **Burada yaratıcılık değil, kaynağa birebir sadakat istenir.**

> **Temel kural (S):** Plan içeriği **üretilmez, aktarılır.** Resmî metin
> özetlenmez, yorumlanmaz, "iyileştirilmez". Yapay zekâ bu tabloya kendi
> cümlesini yazmaz.

### 7.1 `planlar` (künye)

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `title` | TEXT NOT NULL | Kaynak | **S** | **Resmî kurs adı birebir**: *"Bilgi Güvenliği Bilinçlendirme Eğitimi"*. Kısaltma/yeniden adlandırma yapılmaz. |
| | | Biçim | **A** | Her kelime büyük harfle başlar; tamamı büyük yazılmaz. |
| | | Tekillik | **A** | Aynı kurs iki kez içe aktarılmaz. |
| `description` | TEXT NULL | Doluluk | **S** | Pratikte zorunlu — arama sonucunda görünür. |
| | | Biçim | **S** | `import` ucunun kalıbı korunur: `kurs_alani · kurs_suresi` → *"Bilişim Teknolojileri Alanı · 17 Saat"*. |
| `columns` | JSONB NOT NULL | Tip | **S** | Dolu **dizi**. Nesne/metin yazılmaz. |
| | | Standart şema | **S** | Birebir: `["Saat","Öğrenme Kazanımları","Başarım Ölçütleri"]`. |
| | | Eşleşme | **S** | `plan_satirlari.data` anahtarları bu diziyle **tam** örtüşmeli. |
| | | Sıra | **S** | Sütun sırası görüntülenme sırasıdır; karıştırılmaz. |
| `meta` | JSONB NOT NULL | Tip | **S** | Nesne; `{}` bırakılmaz. |
| | | Zorunlu anahtarlar | **S** | `kurs_alani`, `kurs_adi`, `kurs_suresi` — üçü dolu. |
| | | `kurs_suresi` | **A** | `"<sayı> Saat"` kalıbı: `"32 Saat"`. |
| | | Tutarlılık | **S** | `meta.kurs_adi` = `title`. |

### 7.2 `plan_satirlari`

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `plan_id` | INTEGER NOT NULL | Bütünlük | **S** | Var olan `planlar.id` (FK, `ON DELETE CASCADE`). |
| `row_no` | INTEGER NOT NULL | Süreklilik | **S** | **1..N kesintisiz**, atlama/tekrar yok. |
| | | Anlam | **S** | Resmî plan sırası; yeniden numaralandırılmaz. |
| `data` | JSONB NOT NULL | Tip | **S** | **Nesne** (dizi/metin değil). |
| | | Anahtar kümesi | **S** | `columns` ile birebir 3 anahtar. Eksik/fazla anahtar olmaz. Türkçe karakterli tam ad korunur (`Ogrenme Kazanimlari` ✗). |
| | | `Saat` | **S** | Dolu. Sayı veya sayı+birim. |
| | | `Öğrenme Kazanımları` | **S** | **Dolu** — planın asıl içeriği. Boş hücre kabul edilmez. |
| | | `Başarım Ölçütleri` | **A** | Dolu; kazanımın nasıl ölçüleceğini belirtir. |
| | | Değer | **S** | Gerçek içerik; `null` veya `""` yazılmaz. |

---

## 8. `kurs_kitaplari` + `kurs_bolumleri` — Kurs kitabı üretimi

> **Durum: her iki tablo da boş (0 kayıt).** Standartlar ilk kayıttan itibaren
> geçerlidir — tablo baştan doğru doldurulmalı.

> **Dikkat — farklı paragraf kuralı:** Kitap bölümlerinde paragraflar **çift
> satır sonu** (`\n\n`) ile ayrılır (`KursKitapDetail.jsx` → `split(/\n{2,}/)`).
> Sayfalama bu bloklardan otomatik üretilir. Tek `\n` kullanılırsa **tüm bölüm
> tek paragraf** olur ve sayfalama bozulur.

### 8.1 `kurs_kitaplari` (künye)

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `title` | TEXT NOT NULL | Doluluk | **S** | Kitabın tam adı. |
| | | Uzunluk | **A** | **15–90 karakter.** |
| `short_title` | TEXT NULL | Doluluk | **S** | Kitap sırtında/kapakta dar alanda kullanılır. |
| | | Uzunluk | **S** | **≤ 25 karakter.** Uzun ad sırta sığmaz, taşar. |
| | | Tutarlılık | **A** | `title`ın kısaltması olmalı. |
| `author` | TEXT NULL | Doluluk | **S** | Telif gereği zorunlu. Bilinmiyorsa `Kolektif` veya kurum adı. |
| `description` | TEXT NULL | Doluluk | **S** | Liste ve detay sayfasında görünür. |
| | | Uzunluk | **A** | **150–400 karakter.** Konu + hedef okur + kazanım. |
| `cover_url` | TEXT NULL | Doluluk | **A** | Kapaksız kitap listede boş görünür. |
| | | Biçim | **S** | Yalnızca `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif` (sunucu zorlar). |
| | | Oran | **A** | **Dikey ~2:3** (örn. 700×1000). Yatay görsel kapak olmaz. |
| | | Yol | **A** | Panelden yüklenir → `/kapaklar/kitap-<id>-<zaman>.<uzantı>`. |
| `is_active` | BOOLEAN | Yayın şartı | **S** | §2.6 + **en az 5 dolu bölüm**. |

### 8.2 `kurs_bolumleri` (asıl metin)

| Alan | Tip | Ölçüt | Seviye | Standart |
|------|-----|-------|--------|----------|
| `kitap_id` | INTEGER NOT NULL | Bütünlük | **S** | Var olan `kurs_kitaplari.id` (FK, `ON DELETE CASCADE`). |
| `bolum_no` | INTEGER NOT NULL | Süreklilik | **S** | **1..N kesintisiz.** Okuma sırasıdır. |
| `title` | TEXT NULL | Doluluk | **S** | İçindekiler/gezinmede görünür. |
| | | Uzunluk | **A** | **10–70 karakter.** |
| | | Biçim | **S** | Başına numara yazılmaz (`"1. Giriş"` ✗ → `bolum_no` bu işi yapar, `"Giriş"` ✓). |
| `content` | TEXT NULL | Doluluk | **S** | Metinsiz bölüm yayına alınmaz. |
| | | **Uzunluk** | **A** | **4.000–12.000 karakter.** Sayfalama bu metinden üretilir. |
| | | Alt sınır | **S** | **1.500 karakter altı yayına alınmaz.** |
| | | Paragraf | **S** | **Çift satır sonu** (`\n\n`) — §8 uyarısı. |
| | | Paragraf uzunluğu | **A** | 2–6 cümle. Tek dev paragraf sayfalamayı bozar. |
| | | Bütünlük | **S** | Bölüm kendi içinde tamamlanır; cümle ortasında kesilmez. |
| | | Biçimlendirme | **S** | HTML/Markdown gömülmez; düz metin + boş satır. |
| | | Telif | **S** | İzinsiz kitap metni aktarılmaz (kamu malı, lisanslı veya özgün içerik). |

### 8.3 Bölüm sayısı

| Ölçüt | Seviye | Standart |
|-------|--------|----------|
| Alt sınır | **S** | Yayına alınan kitap **en az 5 bölüm**. |
| Hedef | **A** | **10–20 bölüm**, her biri 4.000+ karakter → kitap gövdesi **50.000+ karakter**. |

### 8.4 `kurs_kitap_sayfalari` — kullanılmayan eski yapı

| Ölçüt | Seviye | Standart |
|-------|--------|----------|
| Kullanım | **S** | Bu tabloya **yeni veri yazılmaz.** Kitap metni `kurs_bolumleri`ne girilir. |
| Geçiş | **A** | Eski veri varsa `kurs_bolumleri`ne taşınmalı; tablo şema temizliğinde kaldırılmalı. |

---

## 9. Teslim öncesi kontrol listesi

### 9.1 Her içerik için

- [ ] Tüm **S** kuralları karşılandı
- [ ] Uzunluk hedefi tutuldu (alt sınırın üstünde)
- [ ] Beş ilke sağlandı: detaylı · güncel · uygulanabilir · eğitici · uzun
- [ ] Doğru paragraf ayracı kullanıldı (§2.2 — kitapta `\n\n`, diğerlerinde `\n`)
- [ ] Dolgu cümlesi ve yapay zekâ kalıbı yok
- [ ] Her paragraf yeni bilgi veriyor
- [ ] Sayı/tarih/kurum adı ile somutlaştırıldı
- [ ] Terimler ilk geçtiğinde açıklandı
- [ ] Kaynaklar metinde anıldı; uydurma veri yok
- [ ] Türkçe karakter, imla, birim boşluğu doğru
- [ ] Görsel yolu çalışıyor, dosya mevcut, `[img]` kendi satırında ve açıklaması dolu
- [ ] Başlık aynı tabloda tekrar etmiyor

### 9.2 Türe özel

**`news`** — başlık 55–120 · özet 140–200 ve yeni bilgi içeriyor · içerik 3.000+ ve 8+ paragraf · kategori 6 değerden biri · kapak görseli konuyla ilgili · ters piramit kurulu · sınırlar/bilinmeyenler yazıldı

**`kose_yazilari`** — `author` tam ad, diğer yazılarla birebir tutarlı · çeviride `(çeviri: X)` + editör notu + özgün tarih · içerik 5.000+ · tez→gerekçe→karşı görüş→sonuç akışı · her iddia gerekçeli

**`egitici_yazilar` + `egitici_sayfalar`** — `level` ve `cover_style` geçerli listede · **8+ sayfa** (hedef 15–25) · `page_no` 1..N kesintisiz · her sayfa 600–900 karakter ve tek konu · her sayfada metin veya görsel · görsel künyesi yazıldı · seslendirme ya tam ya hiç · künye `content`i sayfaların kopyası değil

**`arduino_projeleri`** — **11 bölümün tamamı** var · malzemeler adet+değerle · bağlantı tablosu pin pin · **çalışan tam kod** Türkçe yorumlu · kütüphane adları tam · 3+ sık hata · 3–4 geliştirme fikri · güvenlik uyarısı · şema–metin–kod birebir tutarlı · içerik 8.000+

**`planlar` + `plan_satirlari`** — resmî ad birebir aktarıldı, **yorumlanmadı** · `columns` 3 sütunlu standart şema · `meta`nın 3 anahtarı dolu · `meta.kurs_adi` = `title` · satır anahtarları `columns` ile birebir · `Saat` ve `Öğrenme Kazanımları` dolu · `row_no` 1..N

**`kurs_kitaplari` + `kurs_bolumleri`** — `short_title` ≤ 25 karakter · `author` dolu · kapak dikey 2:3 · **5+ bölüm** · `bolum_no` 1..N · bölüm başlığında numara yok · bölümler **`\n\n` ile** paragraflanmış · bölüm 4.000+ karakter

---

## 10. Mevcut verinin ölçülmüş durumu

Hedeflerin gerçekçi olduğunu gösteren referans. Ölçüm: 2026-10-17.

| Tablo | Kayıt | Ortalama içerik | Doluluk | Yapısal tutarlılık |
|-------|-------|-----------------|---------|--------------------|
| `news` | 53 | 2.624 kr (maks 4.464) | özet 53/53 · görsel 53/53 | başlık tekrarı 0 |
| `kose_yazilari` | 6 | 5.710 kr (maks 10.124) | özet 6/6 | 6 yazar, 6 farklı ad |
| `egitici_yazilar` | 4 | 300 kr (künye) | özet 4/4 | `level`/`cover_style` geçersiz 0 |
| `egitici_sayfalar` | 50 | 94–1.281 kr | boş metin 0 | `page_no` 1..N → **4/4 yazıda kusursuz** |
| `arduino_projeleri` | 13 | **9.382 kr** (maks 12.406) | özet 13/13 · şema 13/13 | kod 13/13 |
| `planlar` | 478 | — | `meta` boş 0 · açıklama eksik 0 | **478/478 aynı 3 sütunlu şema** |
| `plan_satirlari` | **94.617** | — | `Saat` boş 0 | yetim 0 · `row_no` bozuk 0 · 3 anahtar 94.617/94.617 |
| `kurs_*` | 0 | — | — | henüz veri yok |

**Güçlü yönler (korunmalı):** `planlar` %100 şema tutarlılığı · `plan_satirlari`
94.617 satırda **0 yetim, 0 sıra hatası** · `arduino_projeleri` 13/13 şema + kod ·
tüm yerel dosya referansları **15/15** çalışıyor · hiçbir tabloda başlık tekrarı yok.

### 10.1 Düzeltilmesi gereken kayıtlar

| # | Tablo | Kayıt | Sorun | Seviye |
|---|-------|-------|-------|--------|
| 1 | `plan_satirlari` | `plan_id=399`, satır 1–2 | `Öğrenme Kazanımları` boş | **C** |
| 2 | `kose_yazilari` | `id=2` | İçerik 216 karakter (tohum veri) | **C** |
| 3 | `egitici_sayfalar` | `yazi_id=7` (4 sayfa) | Sayfalar 94–144 karakter; sayfa sayısı 8 sınırının altında | **C** |
| 4 | `egitici_sayfalar` | `yazi_id=11` | 20 sayfanın 10'unda görsel yok | **B** |
| 5 | `egitici_sayfalar` | `yazi_id=8` | 21 sayfanın yalnızca 2'si sesli | **B** |
| 6 | `egitici_sayfalar` | `yazi_id=10` | 5 sayfa — alt sınırın altında | **B** |
| 7 | `news` | 12 kayıt | Özet 200 karakteri aşıyor (maks 235) | **B** |
| 8 | `news` | **53/53** | Kapak görselleri harici sitelerde | **B** |
| 9 | `arduino_projeleri` | 10 kayıt | Metinde açık "parça listesi" başlığı görünmüyor | **B** |

> **Açık risk — harici görsel bağımlılığı:** Haberlerin **tamamı** görselini dış
> sitelerden çekiyor. Kaynak site görseli silerse/adresi değişirse haber kapaksız
> kalır ve bu fark edilmez. Arduino ve eğitici içerikler bu açıdan sağlam (yerel
> dosya; 15/15 mevcut). **Hedef:** yeni içerikte görseli
> `client/public/gorseller/` altına indirip yerel yola geçmek.

---

## 11. Yapay zekâ modeli için üretim yönergesi

Bu belgeye bakarak içerik üreten model şu sırayı izler:

1. **Türü belirle** ve ilgili bölümü aç (§3–§8).
2. **Yapı iskeletini çıkar** — haber 8 bölüm, köşe 5 bölüm, Arduino **11 bölüm**,
   eğitici sayfa akışı.
3. **Araştır ve somutlaştır** — her bölüm için sayı, tarih, kurum, model adı,
   ölçü birimi topla. Bilmediğin veriyi **uydurma**; o iddiayı yazma.
4. **Yaz** — uzunluk hedefini tutarak, her paragrafta yeni bilgi vererek.
5. **Doğrula** — kod veriyorsan derlenir mi, devre kurulabilir mi, bağlantılar
   tutarlı mı.
6. **§9 kontrol listesinden geçir.**
7. **Künye ekle** — yapay zekâ katkısını, kaynakları ve görsel lisansını belirt.

### Kesin yasaklar

| Yasak | Neden |
|-------|-------|
| Uydurma sayı, tarih, alıntı, kaynak, bağlantı | Güvenilirliği yok eder; **S** ihlali |
| Denenmemiş kod/devre yayımlamak | Okur zarar görür, uygulanabilirlik ilkesi çöker |
| Dolgu cümlesiyle uzunluk şişirmek | Uzunluk ilkesinin amacı derinlik, hacim değil |
| Plan tablolarına kendi cümlesini yazmak | Resmî belge aktarımı; sadakat **S** kuralı |
| Alt sınırın altında içerik teslim etmek | Yayına alınmaz |
| Yanlış paragraf ayracı kullanmak | Sayfalama/render bozulur |
| Yapay zekâ kalıbı bırakmak | "Bir dil modeli olarak", "özetlemek gerekirse" |
| Zorunlu bölüm atlamak | Arduino'da parça listesi/kod/bağlantı eksikse proje uygulanamaz |
