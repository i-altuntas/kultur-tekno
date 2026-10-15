# Eğitici Yazı JSON Üretici (Ollama + gemma)

Arayüzlü Python aracı. Kapak bilgisini ve her sayfanın **başlığını** girersin; araç her sayfa
başlığını yerel **Ollama** üzerindeki **gemma** modeline gönderir, model sayfa **içeriğini**
(kelime sınırıyla) ve bir **görsel URL'si** üretir. Sonuç, sitenin içe aktarma formatında bir
`.json` dosyası olarak kaydedilir.

## Gereksinimler
- Python 3 (sadece standart kütüphane — tkinter + urllib; **ek kurulum yok**)
- Ollama çalışıyor olmalı: `http://localhost:11434`
- Bir gemma modeli yüklü olmalı (ör. `gemma4:latest`). Kontrol: `ollama list`

## Çalıştırma
```bash
python uygulama.py
```
veya Windows'ta `calistir.bat` dosyasına çift tıkla.

## Kullanım
1. **Ollama Ayarları:** sunucu (varsayılan localhost:11434), **model** (varsayılan `gemma4:latest`),
   **sayfa kelime sınırı** (varsayılan 120).
2. **Kapak Bilgileri:** başlık (zorunlu), seviye, özet, kapak metni.
3. **Sayfalar:** "+ Sayfa Ekle" ile satır ekle; her satıra o sayfanın **başlığını** yaz. Silebilirsin.
4. **▶ JSON Oluştur:** her sayfa tek tek gemma'ya sorulur; günlükte ilerleme görünür.
5. **💾 Kaydet:** üretilen JSON'u bir dosyaya kaydet.

## Üretilen JSON (site formatı)
```json
{
  "title": "...", "level": "Başlangıç", "summary": "...", "content": "kapak metni",
  "pages": [
    { "page_no": 1, "image_url": "https://...", "content": "Sayfa başlığı\n<üretilen metin>" }
  ]
}
```

## Siteye aktarma
Kaydettiğin JSON'u sitede: **Panel → Eğitici Yazılar → JSON Yükle** ile içe aktar.
(İstersen her sayfaya sonradan mp3 sesini panelden ekleyebilirsin.)

## Notlar
- Görsel URL'sini model üretir; büyük dil modelleri bazen **gerçek olmayan** bağlantı önerebilir.
  Yüklemeden sonra sitede kontrol edip gerekirse panelden düzeltebilirsin.
- gemma4 CPU'da yavaş olabilir; her sayfa birkaç saniye–dakika sürebilir. Daha hızlı denemek için
  model alanına `gemma2:2b` yazabilirsin.
