import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncOpenAICosts } from "@/lib/sync/openai";
import { syncAnthropicCosts } from "@/lib/sync/anthropic";

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

  const [openai, anthropic] = await Promise.all([
    syncOpenAICosts(user.id, 30),
    syncAnthropicCosts(user.id, 30),
  ]);

  return NextResponse.json({ openai, anthropic });
}
