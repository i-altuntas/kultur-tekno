# -*- coding: utf-8 -*-
"""
Eğitici Yazı JSON Üretici (Ollama + gemma)
------------------------------------------
Arayüzden kapak bilgisini ve her sayfanın başlığını gir; "JSON Oluştur"a bas.
Yazılım her sayfa başlığını yerel Ollama'daki gemma modeline bir promptla gönderir;
model sayfanın içeriğini (kelime sınırı ile) ve bir görsel URL'si üretir.
Sonuç, sitenin "Eğitici Yazılar > JSON Yükle" formatında bir .json dosyasına kaydedilir.

Sadece standart kütüphane kullanır (tkinter + urllib). Ek kurulum gerekmez.
Gereksinim: Ollama çalışıyor olmalı (http://localhost:11434) ve bir gemma modeli yüklü olmalı.
"""

import json
import queue
import threading
import urllib.request
import urllib.error
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

DEFAULT_BASE = "http://localhost:11434"
DEFAULT_MODEL = "gemma4:latest"
DEFAULT_LIMIT = 120
LEVELS = ["Başlangıç", "Orta", "İleri"]


# ----------------------------- Ollama istemcisi -----------------------------
def ollama_tags(base):
    """Yüklü model adlarını döndürür (best-effort)."""
    try:
        with urllib.request.urlopen(base.rstrip("/") + "/api/tags", timeout=5) as r:
            data = json.loads(r.read().decode("utf-8"))
        return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


def ollama_generate(base, model, prompt, temperature=0.7, timeout=300):
    """Ollama /api/generate çağrısı; JSON modunda yanıt ister."""
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": temperature},
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        base.rstrip("/") + "/api/generate",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        outer = json.loads(r.read().decode("utf-8"))
    return outer.get("response", "")


def build_prompt(cover_title, page_title, limit):
    return (
        "Sen Türkçe eğitim içeriği yazan bir uzmansın.\n"
        f'Eğitici yazının genel başlığı: "{cover_title}".\n'
        f'Bu sayfanın konusu/başlığı: "{page_title}".\n\n'
        f"Görev: Bu sayfa için akıcı, bilgilendirici ve en fazla {limit} kelime olan "
        "Türkçe bir açıklama yaz. Sadece bu sayfanın konusuna odaklan.\n"
        "Ayrıca bu konuyu en iyi temsil eden GERÇEK ve erişilebilir bir görsel URL'si öner "
        "(tercihen Wikimedia Commons 'upload.wikimedia.org' doğrudan resim bağlantısı, "
        ".jpg veya .png ile biten).\n\n"
        "Yanıtı SADECE şu JSON ile ver, başka hiçbir metin ekleme:\n"
        '{"content": "<açıklama metni>", "image_url": "<https://...>"}'
    )


def trim_words(text, limit):
    words = text.split()
    if len(words) <= limit:
        return text
    return " ".join(words[:limit]).rstrip(",;:") + "…"


def parse_model_json(resp_text):
    """Modelin döndürdüğü JSON'u ayrıştırır; olmazsa ham metni content sayar."""
    resp_text = (resp_text or "").strip()
    try:
        obj = json.loads(resp_text)
        if isinstance(obj, dict):
            return obj.get("content", "") or "", obj.get("image_url", "") or ""
    except Exception:
        pass
    # JSON çıkmazsa: metni içerik, URL'yi kaba bir şekilde yakala
    url = ""
    for tok in resp_text.split():
        if tok.startswith("http"):
            url = tok.strip('"').strip(",")
            break
    return resp_text, url


# ----------------------------- Arayüz -----------------------------
class App:
    def __init__(self, root):
        self.root = root
        root.title("Eğitici Yazı JSON Üretici — Ollama / gemma")
        root.geometry("860x760")
        self.q = queue.Queue()
        self.page_rows = []
        self.result_json = None
        self.busy = False

        self._build_ui()
        self._add_page()  # bir başlangıç sayfası
        self.root.after(120, self._poll_queue)

    def _build_ui(self):
        pad = {"padx": 8, "pady": 4}
        container = ttk.Frame(self.root, padding=10)
        container.pack(fill="both", expand=True)

        # --- Ollama ayarları ---
        s = ttk.LabelFrame(container, text="Ollama Ayarları", padding=8)
        s.pack(fill="x")
        ttk.Label(s, text="Sunucu").grid(row=0, column=0, sticky="w", **pad)
        self.base_var = tk.StringVar(value=DEFAULT_BASE)
        ttk.Entry(s, textvariable=self.base_var, width=28).grid(row=0, column=1, **pad)
        ttk.Label(s, text="Model").grid(row=0, column=2, sticky="w", **pad)
        self.model_var = tk.StringVar(value=DEFAULT_MODEL)
        self.model_cb = ttk.Combobox(s, textvariable=self.model_var, width=22)
        self.model_cb.grid(row=0, column=3, **pad)
        ttk.Label(s, text="Sayfa kelime sınırı").grid(row=0, column=4, sticky="w", **pad)
        self.limit_var = tk.IntVar(value=DEFAULT_LIMIT)
        ttk.Spinbox(s, from_=30, to=600, increment=10, textvariable=self.limit_var, width=6).grid(row=0, column=5, **pad)

        # modelleri doldur
        names = ollama_tags(self.base_var.get())
        if names:
            self.model_cb["values"] = names
            if DEFAULT_MODEL not in names:
                self.model_var.set(names[0])

        # --- Kapak bilgileri ---
        c = ttk.LabelFrame(container, text="Kapak Bilgileri", padding=8)
        c.pack(fill="x", pady=(10, 0))
        ttk.Label(c, text="Başlık *").grid(row=0, column=0, sticky="w", **pad)
        self.title_var = tk.StringVar()
        ttk.Entry(c, textvariable=self.title_var, width=60).grid(row=0, column=1, columnspan=3, sticky="we", **pad)
        ttk.Label(c, text="Seviye").grid(row=1, column=0, sticky="w", **pad)
        self.level_var = tk.StringVar(value=LEVELS[0])
        ttk.Combobox(c, textvariable=self.level_var, values=LEVELS, width=14, state="readonly").grid(row=1, column=1, sticky="w", **pad)
        ttk.Label(c, text="Özet").grid(row=2, column=0, sticky="w", **pad)
        self.summary_var = tk.StringVar()
        ttk.Entry(c, textvariable=self.summary_var, width=60).grid(row=2, column=1, columnspan=3, sticky="we", **pad)
        ttk.Label(c, text="Kapak metni").grid(row=3, column=0, sticky="nw", **pad)
        self.cover_txt = tk.Text(c, height=3, width=60, wrap="word")
        self.cover_txt.grid(row=3, column=1, columnspan=3, sticky="we", **pad)
        c.columnconfigure(1, weight=1)

        # --- Sayfalar (kaydırılabilir) ---
        p = ttk.LabelFrame(container, text="Sayfalar (her sayfanın başlığını yaz)", padding=8)
        p.pack(fill="both", expand=True, pady=(10, 0))
        topbar = ttk.Frame(p)
        topbar.pack(fill="x")
        ttk.Button(topbar, text="+ Sayfa Ekle", command=self._add_page).pack(side="left")
        ttk.Label(topbar, text="  (İçerik ve görsel URL'si gemma tarafından üretilecek)").pack(side="left")

        canvas_wrap = ttk.Frame(p)
        canvas_wrap.pack(fill="both", expand=True, pady=(6, 0))
        self.canvas = tk.Canvas(canvas_wrap, highlightthickness=0, height=170)
        sb = ttk.Scrollbar(canvas_wrap, orient="vertical", command=self.canvas.yview)
        self.rows_frame = ttk.Frame(self.canvas)
        self.rows_frame.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.rows_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=sb.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        # --- Aksiyonlar ---
        a = ttk.Frame(container)
        a.pack(fill="x", pady=(10, 0))
        self.gen_btn = ttk.Button(a, text="▶  JSON Oluştur (gemma ile)", command=self._start_generate)
        self.gen_btn.pack(side="left")
        self.save_btn = ttk.Button(a, text="💾  Kaydet", command=self._save, state="disabled")
        self.save_btn.pack(side="left", padx=8)
        self.prog = ttk.Progressbar(a, mode="determinate", length=240)
        self.prog.pack(side="left", padx=8)
        self.status = ttk.Label(a, text="hazır")
        self.status.pack(side="left")

        # --- Günlük ---
        lg = ttk.LabelFrame(container, text="Günlük", padding=6)
        lg.pack(fill="both", expand=True, pady=(10, 0))
        self.log = tk.Text(lg, height=8, wrap="word", state="disabled", bg="#111418", fg="#d6e2ea")
        self.log.pack(fill="both", expand=True)

    # ----- sayfa satırları -----
    def _add_page(self):
        row = ttk.Frame(self.rows_frame)
        row.pack(fill="x", pady=3)
        lbl = ttk.Label(row, width=8)
        lbl.pack(side="left")
        var = tk.StringVar()
        ent = ttk.Entry(row, textvariable=var)
        ent.pack(side="left", fill="x", expand=True, padx=6)
        btn = ttk.Button(row, text="Sil", width=5, command=lambda: self._del_page(row))
        btn.pack(side="left")
        self.page_rows.append({"frame": row, "var": var, "label": lbl})
        self._renumber()

    def _del_page(self, row_frame):
        for i, r in enumerate(self.page_rows):
            if r["frame"] is row_frame:
                r["frame"].destroy()
                self.page_rows.pop(i)
                break
        self._renumber()

    def _renumber(self):
        for i, r in enumerate(self.page_rows, start=1):
            r["label"].config(text=f"Sayfa {i}")

    # ----- günlük/queue -----
    def _log(self, msg):
        self.q.put(("log", msg))

    def _poll_queue(self):
        try:
            while True:
                kind, val = self.q.get_nowait()
                if kind == "log":
                    self.log.config(state="normal")
                    self.log.insert("end", val + "\n")
                    self.log.see("end")
                    self.log.config(state="disabled")
                elif kind == "status":
                    self.status.config(text=val)
                elif kind == "prog":
                    self.prog["value"] = val
                elif kind == "progmax":
                    self.prog["maximum"] = val
                    self.prog["value"] = 0
                elif kind == "done":
                    self.result_json = val
                    self.save_btn.config(state="normal")
                    self.gen_btn.config(state="normal")
                    self.busy = False
                elif kind == "fail":
                    self.gen_btn.config(state="normal")
                    self.busy = False
        except queue.Empty:
            pass
        self.root.after(120, self._poll_queue)

    # ----- üretim -----
    def _start_generate(self):
        if self.busy:
            return
        title = self.title_var.get().strip()
        pages = [(i + 1, r["var"].get().strip()) for i, r in enumerate(self.page_rows)]
        pages = [(n, t) for (n, t) in pages if t]
        if not title:
            messagebox.showwarning("Eksik", "Kapak başlığı zorunlu.")
            return
        if not pages:
            messagebox.showwarning("Eksik", "En az bir sayfa başlığı gir.")
            return

        cfg = {
            "base": self.base_var.get().strip(),
            "model": self.model_var.get().strip(),
            "limit": int(self.limit_var.get()),
            "temp": 0.7,
            "cover": {
                "title": title,
                "level": self.level_var.get(),
                "summary": self.summary_var.get().strip(),
                "content": self.cover_txt.get("1.0", "end").strip(),
            },
            "pages": pages,
        }
        self.busy = True
        self.result_json = None
        self.save_btn.config(state="disabled")
        self.gen_btn.config(state="disabled")
        self.q.put(("progmax", len(pages)))
        threading.Thread(target=self._worker, args=(cfg,), daemon=True).start()

    def _worker(self, cfg):
        self._log(f"Model: {cfg['model']} · sayfa sınırı: {cfg['limit']} kelime")
        out_pages = []
        for idx, (page_no, page_title) in enumerate(cfg["pages"], start=1):
            self.q.put(("status", f"{idx}/{len(cfg['pages'])} üretiliyor…"))
            self._log(f"[{idx}] '{page_title}' → gemma'ya gönderiliyor...")
            prompt = build_prompt(cfg["cover"]["title"], page_title, cfg["limit"])
            try:
                resp = ollama_generate(cfg["base"], cfg["model"], prompt, cfg["temp"])
                content, image_url = parse_model_json(resp)
                content = trim_words(content.strip(), cfg["limit"])
                # sayfa başlığını metnin başına ekle
                full = (page_title + "\n" + content).strip() if content else page_title
                out_pages.append({
                    "page_no": page_no,
                    "image_url": image_url,
                    "content": full,
                })
                self._log(f"[{idx}] ✓ {len(content.split())} kelime · görsel: {image_url or '—'}")
            except urllib.error.URLError as e:
                self._log(f"[{idx}] ✗ Ollama'ya ulaşılamadı: {e}. Ollama açık mı?")
                self.q.put(("fail", None))
                self.q.put(("status", "hata"))
                return
            except Exception as e:
                self._log(f"[{idx}] ✗ Hata: {e}")
                out_pages.append({"page_no": page_no, "image_url": "", "content": page_title})
            self.q.put(("prog", idx))

        result = {
            "title": cfg["cover"]["title"],
            "level": cfg["cover"]["level"],
            "summary": cfg["cover"]["summary"],
            "content": cfg["cover"]["content"],
            "pages": out_pages,
        }
        self._log("Tamamlandı. 'Kaydet' ile JSON'u indir.")
        self.q.put(("status", "tamam ✓"))
        self.q.put(("done", result))

    def _save(self):
        if not self.result_json:
            return
        base = (self.title_var.get().strip() or "egitici").lower()
        safe = "".join(ch if ch.isalnum() else "-" for ch in base).strip("-")[:50] or "egitici"
        path = filedialog.asksaveasfilename(
            defaultextension=".json",
            initialfile=f"{safe}.json",
            filetypes=[("JSON", "*.json")],
        )
        if not path:
            return
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.result_json, f, ensure_ascii=False, indent=2)
        self._log(f"Kaydedildi: {path}")
        messagebox.showinfo("Kaydedildi", f"JSON kaydedildi:\n{path}\n\nSiteye: Panel → Eğitici Yazılar → JSON Yükle")


def main():
    root = tk.Tk()
    try:
        ttk.Style().theme_use("clam")
    except Exception:
        pass
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
