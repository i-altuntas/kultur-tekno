import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Tek bir bağlantı havuzu — tüm uygulama bunu kullanır
export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "citynews",
});

pool.on("error", (err) => {
  console.error("Beklenmeyen PostgreSQL hatası:", err);
});
