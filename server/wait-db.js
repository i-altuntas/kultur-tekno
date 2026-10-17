import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const config = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "kulturtekno_db_2026",
  database: "postgres",
};

async function waitForDb() {
  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i++) {
    const client = new Client(config);
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`✓ PostgreSQL bağlantısı hazır (deneme ${i}/${maxAttempts})`);
      return;
    } catch (err) {
      try {
        await client.end();
      } catch {
        // ignore
      }
      console.log(`• PostgreSQL bekleniyor (${i}/${maxAttempts}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error("✗ PostgreSQL 60 saniye içinde yanıt vermedi.");
  process.exit(1);
}

waitForDb();
