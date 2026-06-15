"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Sign-up is gated: only allowed when no user exists yet in the project.
 * This is a single-user personal dashboard.
 */
export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Check whether any user already exists.
  const admin = createAdminClient();
  const { data, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (listError) {
    redirect(`/login?error=${encodeURIComponent(listError.message)}`);
  }

  if (data?.users && data.users.length > 0) {
    redirect(`/login?error=${encodeURIComponent("Signups disabled.")}`);
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account.")}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
