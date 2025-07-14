import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";

export default async function Home() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id") // idだけで十分
    .eq("id", user.id)
    .single();

  if (!profile) {
    // プロフィールがなければオンボーディングページへ
    return redirect('/onboarding');
  }

  return <Dashboard />;
}