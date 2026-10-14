"use server";

import { loginErrorMessage } from "@/lib/auth/login-error-message";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: loginErrorMessage(error?.message ?? "Sign-in failed.") };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    return {
      error: "This account is not active. Open your invite link to join.",
    };
  }

  redirect("/board");
}
