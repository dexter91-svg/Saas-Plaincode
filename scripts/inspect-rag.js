/* eslint-disable no-console */
const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env.local" });

function getArg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function main() {
  const targetChatbotId = getArg("--chatbotId");
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const conn = url
    ? await mysql.createConnection({ uri: url, connectTimeout: 15000 })
    : await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 15000,
      });

  if (targetChatbotId) {
    const [rows] = await conn.execute(
      `SELECT id,
              website_url AS websiteUrl,
              website_title AS websiteTitle,
              LENGTH(COALESCE(website_content,'')) AS websiteChars,
              LENGTH(COALESCE(products_json,'')) AS productsChars,
              LENGTH(COALESCE(uploaded_docs_text,'')) AS legacyDocsChars,
              created_at AS createdAt
       FROM chatbots
       WHERE id = ?`,
      [targetChatbotId]
    );
    const bot = (rows || [])[0];
    if (!bot) {
      console.log("No chatbot found for:", targetChatbotId);
      await conn.end();
      return;
    }
    console.log("chatbot:");
    console.table([bot]);

    const [docCounts] = await conn.execute(
      "SELECT COUNT(*) AS docCount FROM chatbot_documents WHERE chatbot_id = ?",
      [targetChatbotId]
    );
    const [chunkCounts] = await conn.execute(
      "SELECT COUNT(*) AS chunkCount FROM chatbot_knowledge_chunks WHERE chatbot_id = ?",
      [targetChatbotId]
    );
    console.log("docCount:", Number(docCounts?.[0]?.docCount ?? 0));
    console.log("chunkCount:", Number(chunkCounts?.[0]?.chunkCount ?? 0));

    // Show a tiny excerpt from documents to confirm extraction worked
    const [docs] = await conn.execute(
      "SELECT file_name AS fileName, LENGTH(COALESCE(content,'')) AS chars, LEFT(COALESCE(content,''), 600) AS excerpt FROM chatbot_documents WHERE chatbot_id = ? ORDER BY created_at ASC LIMIT 5",
      [targetChatbotId]
    );
    console.log("documents (up to 5):");
    console.table(docs);

    await conn.end();
    return;
  }

  const [bots] = await conn.execute(
    "SELECT id, website_url AS websiteUrl, website_title AS websiteTitle, created_at AS createdAt FROM chatbots ORDER BY created_at DESC LIMIT 10"
  );
  console.log("chatbots (latest 10):");
  console.table(bots);

  const ids = (bots || []).map((b) => b.id).filter(Boolean);
  if (ids.length > 0) {
    const [docCounts] = await conn.execute(
      `SELECT chatbot_id AS chatbotId, COUNT(*) AS docCount
       FROM chatbot_documents
       WHERE chatbot_id IN (${ids.map(() => "?").join(",")})
       GROUP BY chatbot_id`,
      ids
    );
    const [chunkCounts] = await conn.execute(
      `SELECT chatbot_id AS chatbotId, COUNT(*) AS chunkCount
       FROM chatbot_knowledge_chunks
       WHERE chatbot_id IN (${ids.map(() => "?").join(",")})
       GROUP BY chatbot_id`,
      ids
    );
    const [lens] = await conn.execute(
      `SELECT id AS chatbotId,
              LENGTH(COALESCE(website_content,'')) AS websiteChars,
              LENGTH(COALESCE(products_json,'')) AS productsChars,
              LENGTH(COALESCE(uploaded_docs_text,'')) AS legacyDocsChars
       FROM chatbots
       WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids
    );
    const docMap = new Map(docCounts.map((r) => [r.chatbotId, Number(r.docCount || 0)]));
    const chunkMap = new Map(chunkCounts.map((r) => [r.chatbotId, Number(r.chunkCount || 0)]));
    const merged = lens.map((r) => ({
      chatbotId: r.chatbotId,
      websiteChars: Number(r.websiteChars || 0),
      productsChars: Number(r.productsChars || 0),
      legacyDocsChars: Number(r.legacyDocsChars || 0),
      docCount: docMap.get(r.chatbotId) ?? 0,
      chunkCount: chunkMap.get(r.chatbotId) ?? 0,
    }));
    console.log("content + docs + chunk summary (latest 10):");
    console.table(merged);
  }

  const [hasChunks] = await conn.execute("SHOW TABLES LIKE 'chatbot_knowledge_chunks'");
  console.log("has chatbot_knowledge_chunks:", hasChunks.length > 0);

  if (hasChunks.length > 0) {
    const [counts] = await conn.execute(
      "SELECT chatbot_id AS chatbotId, COUNT(*) AS chunkCount FROM chatbot_knowledge_chunks GROUP BY chatbot_id ORDER BY chunkCount DESC LIMIT 20"
    );
    console.log("knowledge chunk counts:");
    console.table(counts);
  }

  const [hasDocs] = await conn.execute("SHOW TABLES LIKE 'chatbot_documents'");
  console.log("has chatbot_documents:", hasDocs.length > 0);

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

