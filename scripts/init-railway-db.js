/**
 * Run database/railway-init.sql against the database in your env.
 * Use this to create all tables on Railway (or any MySQL) from your machine.
 *
 * 1. In Railway: MySQL service → Variables. Copy MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT.
 * 2. In this project root, create .env.railway (or set env vars) with:
 *    DB_HOST=...  DB_USER=...  DB_PASSWORD=...  DB_NAME=...  DB_PORT=3306
 * 3. Run: node scripts/init-railway-db.js
 *    (with env: set DB_* to Railway values, or copy them into .env.local temporarily)
 */
const fs = require("fs");
const path = require("path");

// Load .env.railway if present, else .env.local
const envPath = path.join(__dirname, "..", ".env.railway");
const localPath = path.join(__dirname, "..", ".env.local");
const loadPath = fs.existsSync(envPath) ? envPath : localPath;
if (fs.existsSync(loadPath)) {
  fs.readFileSync(loadPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    });
}

const mysql = require("mysql2/promise");
const sqlPath = path.join(__dirname, "..", "database", "railway-init.sql");

async function main() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  let conn;
  if (url) {
    console.log("Connecting using MYSQL_URL...");
    conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  } else {
    const host = process.env.DB_HOST || process.env.MYSQLHOST;
    const user = process.env.DB_USER || process.env.MYSQLUSER;
    const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
    const database = process.env.DB_NAME || process.env.MYSQLDATABASE || "railway";
    const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || "3306", 10);
    if (!host || !user) {
      console.error("Set MYSQL_URL (from Railway Connect), or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env.railway or .env.local");
      process.exit(1);
    }
    console.log("Connecting to", host, "database", database, "...");
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password: password || "",
      database,
      multipleStatements: true,
    });
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    await conn.query(sql);
    console.log("Done. All tables created.");
  } catch (err) {
    console.error("Error:", err.message);
    await conn.end();
    process.exit(1);
  }
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
