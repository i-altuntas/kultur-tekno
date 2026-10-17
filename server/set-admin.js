import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import {
  ensureAuthSchema,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "./lib/auth.js";

// Kodda veya .env dosyasında e-posta/parola tutmadan, doğrudan veritabanında
// yönetici oluşturmak veya parolasını sıfırlamak için kullanılan CLI aracı.

async function main() {
  await ensureAuthSchema();
  const rl = readline.createInterface({ input, output });

  try {
    const rawEmail = await rl.question("Yönetici e-posta adresi: ");
    const emailErr = validateEmail(rawEmail);
    if (emailErr) {
      console.error("✗ " + emailErr);
      process.exit(1);
    }
    const email = normalizeEmail(rawEmail);

    const password = await rl.question("Yeni yönetici parolası (en az 10 kr, büyük/küçük harf + rakam): ");
    const pwErr = validatePassword(password);
    if (pwErr) {
      console.error("✗ " + pwErr);
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);
    const existing = await pool.query("SELECT id FROM admin_users ORDER BY id LIMIT 1");

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await pool.query(
        "UPDATE admin_users SET email = $1, password_hash = $2, failed_attempts = 0, locked_until = NULL, is_active = true WHERE id = $3",
        [email, hash, id]
      );
      await pool.query("DELETE FROM admin_sessions WHERE user_id = $1", [id]);
      console.log(`✓ Yönetici hesabı güncellendi (ID #${id} → ${email}) ve eski oturumlar kapatıldı.`);
    } else {
      await pool.query(
        "INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, 'Yönetici')",
        [email, hash]
      );
      console.log(`✓ İlk yönetici hesabı oluşturuldu → ${email}`);
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ Hata:", err.message);
  process.exit(1);
});
