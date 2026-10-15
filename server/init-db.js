import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const dbName = process.env.PGDATABASE || "citynews";
const baseConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
};

async function run() {
  // 1) Veritabanını oluştur (yoksa) — önce varsayılan 'postgres' db'sine bağlan
  const admin = new Client({ ...baseConfig, database: "postgres" });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✓ Veritabanı oluşturuldu: ${dbName}`);
  } else {
    console.log(`• Veritabanı zaten var: ${dbName}`);
  }
  await admin.end();

  // 2) Tabloyu oluştur
  const db = new Client({ ...baseConfig, database: dbName });
  await db.connect();
  await db.query(`
    CREATE TABLE IF NOT EXISTS news (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      summary    TEXT,
      content    TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'GÜNDEM',
      image_url  TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Daha önce kurulmuş tablolara kolonu ekle (idempotent)
  await db.query(
    "ALTER TABLE news ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true"
  );
  console.log("✓ 'news' tablosu hazır (is_active dahil)");

  // 3) Tablo boşsa örnek haberler ekle
  const count = await db.query("SELECT COUNT(*)::int AS n FROM news");
  if (count.rows[0].n === 0) {
    await db.query(
      `INSERT INTO news (title, summary, content, category, image_url) VALUES
        ($1,$2,$3,$4,$5),
        ($6,$7,$8,$9,$10),
        ($11,$12,$13,$14,$15)`,
      [
        "Yapay zeka destekli trafik sistemi şehir merkezinde devrede",
        "Yeni nesil sinyalizasyon trafiği gerçek zamanlı optimize ediyor.",
        "Şehir merkezine kurulan yapay zeka destekli trafik yönetim sistemi, sensör verilerini anlık işleyerek yeşil dalga oluşturuyor. İlk haftada ortalama bekleme süresi %23 azaldı.",
        "TEKNOLOJİ",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80",

        "Yerel girişim kuantum sensör laboratuvarı açtı",
        "Üniversite-sanayi iş birliğiyle kurulan lab bölgeye yatırım çekiyor.",
        "Şehirdeki teknokentte açılan kuantum sensör laboratuvarı, savunma ve sağlık alanında yüksek hassasiyetli ölçüm cihazları geliştirecek. Lab, 40 mühendise istihdam sağlayacak.",
        "BİLİM",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",

        "Şehir hatları elektrikli feribotlara geçiyor",
        "Karbon emisyonunu sıfırlamayı hedefleyen filo yenileniyor.",
        "Belediye, deniz ulaşımında kullanılan feribotların tamamını 2027'ye kadar elektrikliye çevirecek. İlk iki tekne önümüzdeki ay sefere başlıyor.",
        "GÜNDEM",
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80",
      ]
    );
    console.log("✓ Örnek haberler eklendi");
  } else {
    console.log(`• Tabloda zaten ${count.rows[0].n} kayıt var, örnek veri eklenmedi`);
  }

  // 4) Köşe Yazıları tablosu
  await db.query(`
    CREATE TABLE IF NOT EXISTS kose_yazilari (
      id         SERIAL PRIMARY KEY,
      author     TEXT NOT NULL DEFAULT 'Editör',
      title      TEXT NOT NULL,
      summary    TEXT,
      content    TEXT NOT NULL,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("✓ 'kose_yazilari' tablosu hazır");

  const kc = await db.query("SELECT COUNT(*)::int AS n FROM kose_yazilari");
  if (kc.rows[0].n === 0) {
    await db.query(
      `INSERT INTO kose_yazilari (author, title, summary, content) VALUES
        ($1,$2,$3,$4),
        ($5,$6,$7,$8)`,
      [
        "Deniz Araç",
        "Şehirler neden yavaşlamalı?",
        "Hız kültürü kentleri yaşanmaz kılıyor; oysa yavaş şehir mümkün.",
        "Modern kentlerin en büyük yanılgısı, her şeyin hızlanması gerektiği inancıdır.\nOysa yürünebilir sokaklar, oturulacak meydanlar ve nefes alınacak yeşil alanlar, bir şehri 'şehir' yapan asıl unsurlardır.\nYavaşlamak, geri kalmak değil; insanı merkeze almaktır.",

        "Selin Korkmaz",
        "Teknoloji bize zaman kazandırıyor mu?",
        "Verimlilik araçları çoğaldıkça neden daha da yoğun hissediyoruz?",
        "Her yeni uygulama bize zaman vaat ediyor.\nAma kazanılan zaman çoğu zaman yeni işlerle doluyor; boşluk, üretkenliğe feda ediliyor.\nBelki de asıl mesele daha hızlı çalışmak değil, neyi yapmayacağımıza karar verebilmek.",
      ]
    );
    console.log("✓ Örnek köşe yazıları eklendi");
  }

  // 5) Eğitici Yazılar tablosu
  await db.query(`
    CREATE TABLE IF NOT EXISTS egitici_yazilar (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      summary     TEXT,
      content     TEXT NOT NULL,
      level       TEXT NOT NULL DEFAULT 'Başlangıç',
      cover_style TEXT NOT NULL DEFAULT 'aurora',
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE egitici_yazilar ADD COLUMN IF NOT EXISTS cover_style TEXT NOT NULL DEFAULT 'aurora'");
  console.log("✓ 'egitici_yazilar' tablosu hazır (cover_style dahil)");

  // Sayfa tablosu — her eğitici yazı sayfa sayfa (her sayfanın kendi metni + görseli)
  await db.query(`
    CREATE TABLE IF NOT EXISTS egitici_sayfalar (
      id         SERIAL PRIMARY KEY,
      yazi_id    INTEGER NOT NULL REFERENCES egitici_yazilar(id) ON DELETE CASCADE,
      page_no    INTEGER NOT NULL DEFAULT 1,
      content    TEXT,
      image_url  TEXT,
      audio_url  TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Daha önce kurulmuş tablolara ses kolonunu ekle (idempotent)
  await db.query("ALTER TABLE egitici_sayfalar ADD COLUMN IF NOT EXISTS audio_url TEXT");
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_egitici_sayfalar_yazi ON egitici_sayfalar(yazi_id, page_no)"
  );
  console.log("✓ 'egitici_sayfalar' tablosu hazır");

  const ec = await db.query("SELECT COUNT(*)::int AS n FROM egitici_yazilar");
  if (ec.rows[0].n === 0) {
    // Örnek: sayfa sayfa (flipbook) okunan bir eğitici yazı
    const ins = await db.query(
      `INSERT INTO egitici_yazilar (title, summary, content, level)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [
        "Arduino'ya Giriş: İlk Devre",
        "Adım adım, sayfa sayfa: breadboard, LED ve ilk kod.",
        "Bu eğitici yazı sayfa sayfa ilerler. Kitabı çevirerek oku.",
        "Başlangıç",
      ]
    );
    const yaziId = ins.rows[0].id;
    const pages = [
      [1, "Breadboard (deney tahtası), bacakları delikler arasında bağlayan bir prototipleme aracıdır.\nGüç hatları kenarlarda, bağlantı sıraları ortadadır.", "https://picsum.photos/seed/egitim-s1/900/600"],
      [2, "LED'in uzun bacağı (+) anot, kısa bacağı (−) katottur.\nLED'i korumak için seri bir direnç (220Ω) kullanılır.", "https://picsum.photos/seed/egitim-s2/900/600"],
      [3, "Arduino'da pinMode(13, OUTPUT) ile pini çıkış yaparız.\ndigitalWrite(13, HIGH) LED'i yakar, LOW söndürür.", "https://picsum.photos/seed/egitim-s3/900/600"],
      [4, "delay(1000) bir saniye bekletir.\nYakma-söndürme döngüsüyle LED yanıp söner — ilk projen hazır!", "https://picsum.photos/seed/egitim-s4/900/600"],
    ];
    for (const [no, text, img] of pages) {
      await db.query(
        "INSERT INTO egitici_sayfalar (yazi_id, page_no, content, image_url) VALUES ($1,$2,$3,$4)",
        [yaziId, no, text, img]
      );
    }
    console.log("✓ Örnek sayfalı eğitici yazı eklendi");
  }

  // 6) Arduino Projeleri tablosu (üstte devre resmi + altında yazı)
  await db.query(`
    CREATE TABLE IF NOT EXISTS arduino_projeleri (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      summary    TEXT,
      content    TEXT NOT NULL,
      image_url  TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("✓ 'arduino_projeleri' tablosu hazır");

  const ac = await db.query("SELECT COUNT(*)::int AS n FROM arduino_projeleri");
  if (ac.rows[0].n === 0) {
    await db.query(
      `INSERT INTO arduino_projeleri (title, summary, content, image_url) VALUES
        ($1,$2,$3,$4),
        ($5,$6,$7,$8)`,
      [
        "LDR ile otomatik gece lambası",
        "Ortam karardığında LED'i otomatik yakan basit devre.",
        "Bu projede bir LDR (ışık sensörü) ile ortam ışığını ölçüp, karanlıkta bir LED yakıyoruz.\nLDR, gerilim bölücü olarak bağlanır; analog pin okunan değere göre LED dijital pinden sürülür.\nParça listesi: Arduino Uno, LDR, 10k direnç, LED, 220Ω direnç, breadboard ve jumper kablolar.",
        "https://picsum.photos/seed/arduino-ldr/1000/600",

        "Ultrasonik mesafe sensörü ile park sensörü",
        "HC-SR04 ile mesafeyi ölçüp buzzer'ı mesafeye göre öttüren devre.",
        "HC-SR04 ultrasonik sensör, trig pininden ses dalgası gönderip echo pininden yankıyı ölçerek mesafe hesaplar.\nMesafe azaldıkça buzzer daha sık öter; 10 cm altında sürekli sinyal verir.\nParça listesi: Arduino Uno, HC-SR04, buzzer, breadboard ve jumper kablolar.",
        "https://picsum.photos/seed/arduino-hcsr04/1000/600",
      ]
    );
    console.log("✓ Örnek Arduino projeleri eklendi");
  }

  // 7) Planlar — üst veri (planlar) + içerik satırları (plan_satirlari), bağlantılı
  await db.query(`
    CREATE TABLE IF NOT EXISTS planlar (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      columns     JSONB NOT NULL DEFAULT '[]'::jsonb,
      meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE planlar ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb");
  await db.query(`
    CREATE TABLE IF NOT EXISTS plan_satirlari (
      id         SERIAL PRIMARY KEY,
      plan_id    INTEGER NOT NULL REFERENCES planlar(id) ON DELETE CASCADE,
      row_no     INTEGER NOT NULL DEFAULT 1,
      data       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_plan_satirlari_plan ON plan_satirlari(plan_id, row_no)");
  console.log("✓ 'planlar' + 'plan_satirlari' tabloları hazır");

  const pc = await db.query("SELECT COUNT(*)::int AS n FROM planlar");
  if (pc.rows[0].n === 0) {
    const cols = ["Hafta", "Konu", "Süre", "Durum"];
    const ins = await db.query(
      "INSERT INTO planlar (title, description, columns) VALUES ($1,$2,$3::jsonb) RETURNING id",
      ["Örnek Haftalık Ders Planı", "Dönemlik örnek ders planı.", JSON.stringify(cols)]
    );
    const pid = ins.rows[0].id;
    const rows = [
      { Hafta: 1, Konu: "Giriş ve kurulum", "Süre": "2 saat", Durum: "Tamamlandı" },
      { Hafta: 2, Konu: "Temel kavramlar", "Süre": "3 saat", Durum: "Planlandı" },
      { Hafta: 3, Konu: "Uygulama atölyesi", "Süre": "4 saat", Durum: "Planlandı" },
    ];
    for (let i = 0; i < rows.length; i++) {
      await db.query(
        "INSERT INTO plan_satirlari (plan_id, row_no, data) VALUES ($1,$2,$3::jsonb)",
        [pid, i + 1, JSON.stringify(rows[i])]
      );
    }
    console.log("✓ Örnek plan eklendi");
  }

  // 8) Kurs Kitapları — üst veri+kapak (kurs_kitaplari) + sayfa metinleri (kurs_kitap_sayfalari)
  await db.query(`
    CREATE TABLE IF NOT EXISTS kurs_kitaplari (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      short_title TEXT,
      author      TEXT,
      description TEXT,
      cover_url   TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("ALTER TABLE kurs_kitaplari ADD COLUMN IF NOT EXISTS short_title TEXT");
  // Bölümler (bölüm no + başlık + paragraflı metin) — dinamik sayfalama için
  await db.query(`
    CREATE TABLE IF NOT EXISTS kurs_bolumleri (
      id         SERIAL PRIMARY KEY,
      kitap_id   INTEGER NOT NULL REFERENCES kurs_kitaplari(id) ON DELETE CASCADE,
      bolum_no   INTEGER NOT NULL DEFAULT 1,
      title      TEXT,
      content    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_kurs_bolumleri ON kurs_bolumleri(kitap_id, bolum_no)");
  await db.query(`
    CREATE TABLE IF NOT EXISTS kurs_kitap_sayfalari (
      id         SERIAL PRIMARY KEY,
      kitap_id   INTEGER NOT NULL REFERENCES kurs_kitaplari(id) ON DELETE CASCADE,
      page_no    INTEGER NOT NULL DEFAULT 1,
      content    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query("CREATE INDEX IF NOT EXISTS idx_kurs_kitap_sayfalari ON kurs_kitap_sayfalari(kitap_id, page_no)");
  console.log("✓ 'kurs_kitaplari' + 'kurs_kitap_sayfalari' tabloları hazır");

  const kb = await db.query("SELECT COUNT(*)::int AS n FROM kurs_bolumleri");
  if (kb.rows[0].n === 0) {
    // Örnek kitap (yoksa oluştur) + bölümler
    let kid;
    const ex = await db.query("SELECT id FROM kurs_kitaplari ORDER BY id LIMIT 1");
    if (ex.rows[0]) {
      kid = ex.rows[0].id;
      await db.query("UPDATE kurs_kitaplari SET short_title = COALESCE(short_title,$1) WHERE id=$2", ["İnsan ve Zaman", kid]);
    } else {
      const ins = await db.query(
        "INSERT INTO kurs_kitaplari (title, short_title, author, description, cover_url) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [
          "İnsan ve Zaman",
          "İnsan ve Zaman",
          "A. Yazar",
          "Zaman, hafıza ve başlangıçlar üzerine denemeler.",
          "https://picsum.photos/seed/kurskitap/700/1000",
        ]
      );
      kid = ins.rows[0].id;
    }
    const bolumler = [
      [
        1,
        "İnsan ve Zaman",
        "İnsan, zamanın içinden geçerken geride bıraktığı günlerin değerini çoğu zaman sonradan anlar. Bir sabahın sessizliği, bir cümlenin anlamı ya da yıllar önce verilmiş küçük bir karar, hayatın bütün yönünü değiştirebilir.\n\nHer hikâye bir başlangıçla ortaya çıkar. Fakat başlangıç dediğimiz şey, çoğu zaman daha önce yaşanmış olayların görünmeyen bir devamıdır. İnsan, kendi geçmişini anlamaya başladığında geleceğe de başka bir gözle bakar.\n\nBelki de bu yüzden bazı soruların cevabı kitaplarda değil, insanın kendi içinde saklıdır. Kelimeler yalnızca o cevaba giden yolu aydınlatır.\n\nZamanın akışı bir nehre benzer; durmadan ilerler, geri dönmez. Fakat hafıza, o nehrin kıyısında biriken taşlar gibidir. İnsan, o taşlara bakarak suyun nereden geldiğini hatırlar.",
      ],
      [
        2,
        "Sessizliğin Dili",
        "Bazı anlar vardır ki, söylenen hiçbir söz onların yerini tutamaz. Sessizlik, çoğu zaman en derin cümleden daha fazlasını anlatır.\n\nİnsan konuşmayı öğrenmeden önce dinlemeyi öğrenmelidir. Çünkü anlamak, konuşmanın değil, dinlemenin sonucudur.\n\nBir kitabın sayfaları arasında dolaşırken, kelimelerin arasındaki boşlukların da bir anlamı olduğunu fark ederiz. O boşluklar, okuyanın kendi düşüncelerini yerleştirdiği yerlerdir.",
      ],
    ];
    for (const [no, title, content] of bolumler) {
      await db.query(
        "INSERT INTO kurs_bolumleri (kitap_id, bolum_no, title, content) VALUES ($1,$2,$3,$4)",
        [kid, no, title, content]
      );
    }
    console.log("✓ Örnek kurs kitabı bölümleri eklendi");
  }

  await db.end();
  console.log("\nKurulum tamam. Artık 'npm start' ile sunucuyu başlatabilirsin.");
}

run().catch((err) => {
  console.error("\n✗ Kurulum hatası:", err.message);
  console.error("  .env dosyasındaki PGUSER / PGPASSWORD bilgilerini kontrol et.");
  process.exit(1);
});
