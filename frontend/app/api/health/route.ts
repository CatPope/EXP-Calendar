import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: {
      ok: true,
      service: "exp-calendar-frontend",
      ts: new Date().toISOString()
    }
  });
}
