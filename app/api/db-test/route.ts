import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const result = await testConnection();
  return NextResponse.json(result);
}
