#!/usr/bin/env node
// Kültür Tekno MCP sunucusu.
// Claude Desktop bu araçlar üzerinden yerel API'ye (Express :4000) bağlanıp
// haber ekler, listeler ve siler. API'den geçtiği için her şey PostgreSQL'e yazılır
// ve site otomatik yenileme ile birkaç saniyede gösterir.
//
// NOT (stdio protokolü): Bu sunucu stdout'u MCP mesajları için kullanır;
// bu yüzden log'lar yalnızca console.error (stderr) ile yazılır.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = (process.env.CITYNEWS_API || "http://localhost:4000").replace(/\/$/, "");

// Yerel API'ye istek atan yardımcı — bağlantı/HTTP hatalarını araç sonucuna çevirir
async function callApi(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, options);
  } catch (err) {
    throw new Error(
      `API'ye bağlanılamadı (${API}). Sunucu çalışıyor mu? ('cd server && npm start')\n${err.message}`
    );
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error : text || res.statusText;
    throw new Error(`API hatası ${res.status}: ${msg}`);
  }
  return data;
}

const ok = (text) => ({ content: [{ type: "text", text }] });
const fail = (text) => ({ isError: true, content: [{ type: "text", text }] });

const server = new McpServer({ name: "citynews", version: "1.0.0" });

const CATEGORIES = "GÜNDEM, TEKNOLOJİ, BİLİM, EKONOMİ, SPOR, KÜLTÜR";

// ---- haber_ekle ----
server.registerTool(
  "haber_ekle",
  {
    title: "Haber ekle",
    description:
      "Kültür Tekno sitesine yeni bir haber ekler. Haber PostgreSQL'e kaydedilir ve " +
      "sitede birkaç saniye içinde otomatik yayınlanır. Metnin arasına görsel gömmek " +
      "için içeriğe '[img]https://... | açıklama[/img]' satırı ekleyebilirsin (birden fazla olabilir).",
    inputSchema: {
      title: z.string().min(1).describe("Haber başlığı (zorunlu)"),
      content: z
        .string()
        .min(1)
        .describe(
          "Haber metni (zorunlu). Paragraflar için satır atla. Metne görsel için '[img]URL | açıklama[/img]' satırı ekle."
        ),
      category: z
        .string()
        .optional()
        .describe(`Kategori (opsiyonel, varsayılan GÜNDEM). Önerilen: ${CATEGORIES}`),
      summary: z.string().optional().describe("Kısa özet — liste görünümünde görünür (opsiyonel)"),
      image_url: z.string().optional().describe("Kapak görseli URL'si (opsiyonel)"),
    },
  },
  async ({ title, content, category, summary, image_url }) => {
    try {
      const o = await callApi("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, summary, image_url }),
      });
      return ok(`✓ Haber eklendi (id=${o.id}) [${o.category}]: ${o.title}`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- haber_listele ----
server.registerTool(
  "haber_listele",
  {
    title: "Haberleri listele",
    description:
      "Haberleri listeler (en yeni önce). Silmek/durum değiştirmek için doğru id'yi bulmak üzere kullan. " +
      "Varsayılan sadece aktif haberleri gösterir; pasifleri de görmek için tumu=true ver.",
    inputSchema: {
      category: z.string().optional().describe(`Yalnızca bu kategoriyi getir (opsiyonel). Örn: ${CATEGORIES}`),
      tumu: z.boolean().optional().describe("true → pasif (gizli) haberler de listelensin"),
    },
  },
  async ({ category, tumu }) => {
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (tumu) params.set("all", "1");
      const qs = params.toString();
      const rows = await callApi(`/api/news${qs ? `?${qs}` : ""}`);
      if (!rows.length) return ok("Haber yok.");
      const list = rows
        .map((r) => `#${r.id} ${r.is_active ? "[AKTİF]" : "[PASİF]"} [${r.category}] ${r.title}`)
        .join("\n");
      return ok(`${rows.length} haber:\n${list}`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- haber_durum_degistir ----
server.registerTool(
  "haber_durum_degistir",
  {
    title: "Haberi aktif/pasif yap",
    description:
      "Bir haberi pasife alır (sitede gizlenir) veya tekrar aktif eder (yayınlanır). " +
      "Haber silinmez, yalnızca görünürlüğü değişir. id'den emin değilsen önce 'haber_listele' çağır.",
    inputSchema: {
      id: z.number().int().positive().describe("Haberin id'si"),
      aktif: z.boolean().describe("true → aktif (yayında), false → pasif (gizli)"),
    },
  },
  async ({ id, aktif }) => {
    try {
      const o = await callApi(`/api/news/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: aktif }),
      });
      return ok(`✓ #${o.id} artık ${o.is_active ? "AKTİF (yayında)" : "PASİF (gizli)"}: ${o.title}`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- haber_sil ----
server.registerTool(
  "haber_sil",
  {
    title: "Haber sil",
    description:
      "Verilen id'ye sahip haberi kalıcı olarak siler. id'den emin değilsen önce 'haber_listele' çağır.",
    inputSchema: {
      id: z.number().int().positive().describe("Silinecek haberin id'si (haber_listele çıktısındaki numara)"),
    },
  },
  async ({ id }) => {
    try {
      await callApi(`/api/news/${id}`, { method: "DELETE" });
      return ok(`✓ Haber silindi (id=${id}).`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- köşe yazısı ekle ----
server.registerTool(
  "kose_yazisi_ekle",
  {
    title: "Köşe yazısı ekle",
    description:
      "Kültür Tekno'ya yeni bir köşe yazısı ekler (PostgreSQL'e kaydedilir, sitedeki 'Köşe Yazıları' bölümünde yayınlanır). " +
      "İçeriğe '[img]URL | açıklama[/img]' satırıyla görsel gömülebilir.",
    inputSchema: {
      title: z.string().min(1).describe("Yazı başlığı (zorunlu)"),
      content: z.string().min(1).describe("Yazı metni (zorunlu). Paragraflar için satır atla."),
      author: z.string().optional().describe("Yazar adı (opsiyonel, varsayılan 'Editör')"),
      summary: z.string().optional().describe("Kısa özet (opsiyonel)"),
    },
  },
  async ({ title, content, author, summary }) => {
    try {
      const o = await callApi("/api/kose_yazilari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, author, summary }),
      });
      return ok(`✓ Köşe yazısı eklendi (id=${o.id}) — ${o.author}: ${o.title}`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- köşe yazısı listele ----
server.registerTool(
  "kose_yazilari_listele",
  {
    title: "Köşe yazılarını listele",
    description: "Köşe yazılarını listeler (id, durum, yazar, başlık). tumu=true ile pasifler de gelir.",
    inputSchema: { tumu: z.boolean().optional().describe("true → pasifler de listelensin") },
  },
  async ({ tumu }) => {
    try {
      const rows = await callApi(`/api/kose_yazilari${tumu ? "?all=1" : ""}`);
      if (!rows.length) return ok("Köşe yazısı yok.");
      return ok(
        `${rows.length} köşe yazısı:\n` +
          rows.map((r) => `#${r.id} ${r.is_active ? "[AKTİF]" : "[PASİF]"} ${r.author} — ${r.title}`).join("\n")
      );
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- köşe yazısı sil ----
server.registerTool(
  "kose_yazisi_sil",
  {
    title: "Köşe yazısı sil",
    description: "id ile köşe yazısını kalıcı siler. Emin değilsen önce 'kose_yazilari_listele' çağır.",
    inputSchema: { id: z.number().int().positive().describe("Silinecek köşe yazısının id'si") },
  },
  async ({ id }) => {
    try {
      await callApi(`/api/kose_yazilari/${id}`, { method: "DELETE" });
      return ok(`✓ Köşe yazısı silindi (id=${id}).`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- eğitici yazı ekle ----
server.registerTool(
  "egitici_yazi_ekle",
  {
    title: "Eğitici yazı ekle",
    description:
      "Kültür Tekno'ya yeni bir eğitici yazı ekler (sitedeki 'Eğitici Yazılar' bölümünde yayınlanır). " +
      "İçeriğe '[img]URL | açıklama[/img]' satırıyla görsel gömülebilir.",
    inputSchema: {
      title: z.string().min(1).describe("Başlık (zorunlu)"),
      content: z.string().min(1).describe("İçerik (zorunlu). Paragraflar için satır atla."),
      level: z.enum(["Başlangıç", "Orta", "İleri"]).optional().describe("Seviye (opsiyonel, varsayılan Başlangıç)"),
      summary: z.string().optional().describe("Kısa özet (opsiyonel)"),
    },
  },
  async ({ title, content, level, summary }) => {
    try {
      const o = await callApi("/api/egitici_yazilar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, level, summary }),
      });
      return ok(`✓ Eğitici yazı eklendi (id=${o.id}) [${o.level}]: ${o.title}`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- eğitici yazı listele ----
server.registerTool(
  "egitici_yazilar_listele",
  {
    title: "Eğitici yazıları listele",
    description: "Eğitici yazıları listeler (id, durum, seviye, başlık). tumu=true ile pasifler de gelir.",
    inputSchema: { tumu: z.boolean().optional().describe("true → pasifler de listelensin") },
  },
  async ({ tumu }) => {
    try {
      const rows = await callApi(`/api/egitici_yazilar${tumu ? "?all=1" : ""}`);
      if (!rows.length) return ok("Eğitici yazı yok.");
      return ok(
        `${rows.length} eğitici yazı:\n` +
          rows.map((r) => `#${r.id} ${r.is_active ? "[AKTİF]" : "[PASİF]"} [${r.level}] ${r.title}`).join("\n")
      );
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- eğitici yazı sil ----
server.registerTool(
  "egitici_yazi_sil",
  {
    title: "Eğitici yazı sil",
    description: "id ile eğitici yazıyı kalıcı siler. Emin değilsen önce 'egitici_yazilar_listele' çağır.",
    inputSchema: { id: z.number().int().positive().describe("Silinecek eğitici yazının id'si") },
  },
  async ({ id }) => {
    try {
      await callApi(`/api/egitici_yazilar/${id}`, { method: "DELETE" });
      return ok(`✓ Eğitici yazı silindi (id=${id}).`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- arduino projesi ekle ----
server.registerTool(
  "arduino_proje_ekle",
  {
    title: "Arduino projesi ekle",
    description:
      "Kültür Tekno'ya yeni bir Arduino projesi ekler (sitedeki 'Arduino Projeleri' bölümünde yayınlanır). " +
      "Üstte devre resmi (devre_resmi), altında açıklama yazısı gösterilir.",
    inputSchema: {
      title: z.string().min(1).describe("Proje başlığı (zorunlu)"),
      content: z.string().min(1).describe("Açıklama/yazı (zorunlu). Parça listesi ve çalışma mantığı. Paragraflar için satır atla."),
      devre_resmi: z.string().optional().describe("Devre şeması görseli URL'si (üstte büyük gösterilir)"),
      summary: z.string().optional().describe("Kısa özet (opsiyonel)"),
    },
  },
  async ({ title, content, devre_resmi, summary }) => {
    try {
      const o = await callApi("/api/arduino_projeleri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, image_url: devre_resmi, summary }),
      });
      return ok(`✓ Arduino projesi eklendi (id=${o.id}): ${o.title}${o.image_url ? " (devre resmi eklendi)" : ""}`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- arduino projelerini listele ----
server.registerTool(
  "arduino_projeleri_listele",
  {
    title: "Arduino projelerini listele",
    description: "Arduino projelerini listeler (id, durum, başlık). tumu=true ile pasifler de gelir.",
    inputSchema: { tumu: z.boolean().optional().describe("true → pasifler de listelensin") },
  },
  async ({ tumu }) => {
    try {
      const rows = await callApi(`/api/arduino_projeleri${tumu ? "?all=1" : ""}`);
      if (!rows.length) return ok("Arduino projesi yok.");
      return ok(
        `${rows.length} Arduino projesi:\n` +
          rows.map((r) => `#${r.id} ${r.is_active ? "[AKTİF]" : "[PASİF]"} ${r.title}`).join("\n")
      );
    } catch (err) {
      return fail(err.message);
    }
  }
);

// ---- arduino projesi sil ----
server.registerTool(
  "arduino_proje_sil",
  {
    title: "Arduino projesi sil",
    description: "id ile Arduino projesini kalıcı siler. Emin değilsen önce 'arduino_projeleri_listele' çağır.",
    inputSchema: { id: z.number().int().positive().describe("Silinecek projenin id'si") },
  },
  async ({ id }) => {
    try {
      await callApi(`/api/arduino_projeleri/${id}`, { method: "DELETE" });
      return ok(`✓ Arduino projesi silindi (id=${id}).`);
    } catch (err) {
      return fail(err.message);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[citynews-mcp] hazır → API: ${API}`);
