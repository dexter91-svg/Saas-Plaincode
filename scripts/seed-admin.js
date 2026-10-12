const fs = require("fs");
const path = require("path");

// Load .env.local if present (local dev)
const localPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(localPath)) {
  fs.readFileSync(localPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    });
}

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const ADMIN_EMAIL = "admin@plainbot.com";
const ADMIN_PASSWORD = "123456";

async function run() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  let conn;
  if (url) {
    conn = await mysql.createConnection(url);
  } else {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "ecommerce_support",
    });
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const [rows] = await conn.execute("SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]);

  if (rows.length > 0) {
    await conn.execute(
      "UPDATE users SET password_hash = ?, is_admin = 1 WHERE email = ?",
      [hash, ADMIN_EMAIL]
    );
    console.log(`Updated existing account — ${ADMIN_EMAIL} is now an admin.`);
  } else {
    const id = randomUUID();
    await conn.execute(
      "INSERT INTO users (id, email, password_hash, plan, is_admin) VALUES (?, ?, ?, 'free', 1)",
      [id, ADMIN_EMAIL, hash]
    );
    console.log(`Created admin account — ${ADMIN_EMAIL}`);
  }

  await conn.end();
}

run().catch((e) => { console.error(e.message); process.exit(1); });
