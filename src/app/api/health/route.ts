import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runHealthChecks } from "@/lib/health/check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const results = await runHealthChecks(user.id);
  return NextResponse.json({ results });
}
