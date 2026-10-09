const fs = require("fs");
const path = require("path");

// Load .env.local
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
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  let conn;
  if (url) {
    console.log("Connecting via MYSQL_URL...");
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
  await conn.execute("ALTER TABLE ai_usage MODIFY COLUMN user_id CHAR(36) NULL");
  console.log("Done — ai_usage.user_id is now nullable.");
  const [r] = await conn.execute("DELETE FROM ai_usage WHERE user_id IS NULL");
  console.log(`Deleted ${r.affectedRows} unattributed rows.`);
  await conn.end();
}

run().catch((e) => { console.error(e.message); process.exit(1); });
