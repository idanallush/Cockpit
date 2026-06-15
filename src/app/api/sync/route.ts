import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncOneUser } from "@/lib/sync/run-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const summary = await syncOneUser(user.id, "manual", 30);
  return NextResponse.json(summary);
}
