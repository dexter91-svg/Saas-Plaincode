/**
 * Clear all data from MySQL. Cross-platform (Windows, Mac, Linux).
 * Run: node scripts/clear-db.js
 * Or: npm run db:clear
 * Uses .env.local or .env.railway; supports MYSQL_URL or DB_* vars.
 */
const fs = require("fs");
const path = require("path");

// Load .env.local first so we clear the SAME DB the app uses (npm run dev reads .env.local)
const localPath = path.join(__dirname, "..", ".env.local");
const envPath = path.join(__dirname, "..", ".env.railway");
const loadPath = fs.existsSync(localPath) ? localPath : envPath;
if (fs.existsSync(loadPath)) {
  fs.readFileSync(loadPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    });
}

const mysql = require("mysql2/promise");

async function clear() {
  const sqlPath = path.join(__dirname, "..", "database", "clear.sql");
  let sql = fs.readFileSync(sqlPath, "utf8");
  sql = sql.replace(/USE\s+\w+;?\s*/i, "");

  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  let conn;
  if (url) {
    console.log("Connecting via MYSQL_URL...");
    conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  } else {
    const host = process.env.DB_HOST || "localhost";
    const port = parseInt(process.env.DB_PORT || "3306", 10);
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "ecommerce_support";
    console.log("Connecting to MySQL...");
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
    });
  }

  await conn.query(sql);
  await conn.end();

  console.log("Database cleared successfully.");
}

clear().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
