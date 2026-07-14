import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * GET /api/knowledge/check
 * Returns whether Pinecone env vars are set so you can test .env locally.
 */
export async function GET() {
  const auth = await getAuthFromCookie();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasKey = !!process.env.PINECONE_API_KEY?.trim();
  const hasIndex = !!process.env.PINECONE_INDEX_NAME?.trim();
  const hasEnv = !!process.env.PINECONE_ENVIRONMENT?.trim();
  const configured = hasKey && hasIndex && hasEnv;

  return NextResponse.json({
    configured,
    env: {
      PINECONE_API_KEY: hasKey ? "set" : "missing",
      PINECONE_INDEX_NAME: hasIndex ? "set" : "missing",
      PINECONE_ENVIRONMENT: hasEnv ? "set" : "missing",
    },
  });
}
