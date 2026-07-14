/**
 * Standalone script to test MySQL connection.
 * Run: node scripts/test-db.js
 * Loads .env.local from project root.
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
}

const mysql = require("mysql2/promise");

async function test() {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "ecommerce_support";

  console.log("\n--- .env analysis ---");
  console.log("DB_HOST:", host || "(not set)");
  console.log("DB_PORT:", port);
  console.log("DB_USER:", user || "(not set)");
  console.log("DB_NAME:", database);
  console.log("DB_PASSWORD:", password ? "***" : "(empty)");
  console.log("");

  if (!user || user === "your_mysql_user") {
    console.error("ERROR: DB_USER is still the placeholder 'your_mysql_user'.");
    console.error("       Set DB_USER to your MySQL username (e.g. root) in .env.local");
    process.exit(1);
  }

  try {
    console.log("Connecting to MySQL...");
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });

    const [rows] = await conn.execute("SELECT 1 as ping, DATABASE() as db");
    await conn.end();

    console.log("SUCCESS: Database connection OK");
    console.log("Result:", rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error("\n  MySQL may not be running. Start MySQL service.");
    }
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("\n  Wrong username or password. Check DB_USER and DB_PASSWORD.");
    }
    if (err.code === "ER_BAD_DB_ERROR") {
      console.error("\n  Database '" + database + "' does not exist. Run: mysql < database/schema.sql");
    }
    process.exit(1);
  }
}

test();
