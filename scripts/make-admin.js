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

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/make-admin.js <email>");
    process.exit(1);
  }

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

  const [rows] = await conn.execute("SELECT id, email FROM users WHERE email = ?", [email]);
  if (!rows.length) {
    console.error(`No user found with email: ${email}`);
    await conn.end();
    process.exit(1);
  }

  await conn.execute("UPDATE users SET is_admin = 1 WHERE email = ?", [email]);
  console.log(`Done — ${email} is now an admin.`);
  await conn.end();
}

run().catch((e) => { console.error(e.message); process.exit(1); });
