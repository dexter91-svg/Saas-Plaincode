import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

function getDbConfig() {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "ecommerce_support";
  return { host, port, user, password, database };
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    pool = mysql.createPool(url);
  } else {
    const config = getDbConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
    });
  }
  return pool;
}

/** Wraps a pooled connection so .end() releases back to the pool instead of destroying the connection. */
function wrapPooledConnection(conn: PoolConnection): PoolConnection {
  (conn as PoolConnection & { end: () => Promise<void> }).end = async () => {
    conn.release();
  };
  return conn;
}

export async function getDbConnection(): Promise<PoolConnection> {
  const p = getPool();
  const conn = await p.getConnection();
  return wrapPooledConnection(conn);
}

export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  try {
    const conn = await getDbConnection();
    const [rows] = await conn.execute("SELECT 1 as ping");
    await conn.end();

    return {
      ok: true,
      message: "Database connection successful",
      details: { ping: (rows as { ping: number }[])[0]?.ping },
    };
  } catch (err: unknown) {
    const e = err as Error;
    return {
      ok: false,
      message: e.message || "Connection failed",
      details: {
        code: (err as { code?: string })?.code,
        errno: (err as { errno?: number })?.errno,
      },
    };
  }
}
