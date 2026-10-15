# Kültür Tekno — tek imaj (istemci derlenir + Express sunucu hem API hem statik sunar)

# 1) İstemciyi derle (Vite → client/dist)
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2) Sunucu çalışma imajı
FROM node:20-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
# Üretimde sunucu derlenmiş istemciyi ve yüklenen görselleri sunar
ENV SERVE_STATIC=1
ENV DIST_DIR=/app/client/dist
ENV UPLOAD_DIR=/app/uploads
ENV PORT=4000

# Sadece üretim bağımlılıkları
COPY server/package*.json ./
RUN npm ci --omit=dev

# Sunucu kaynağı
COPY server/ ./

# Derlenmiş istemci
COPY --from=client-build /app/client/dist /app/client/dist

# Çalışma zamanında yüklenen kapaklar için kalıcı klasör (compose'ta volume bağlanır)
RUN mkdir -p /app/uploads/kapaklar

EXPOSE 4000

# Önce şema/tabloları oluştur (idempotent), sonra sunucuyu başlat
CMD ["sh", "-c", "node init-db.js && node index.js"]
