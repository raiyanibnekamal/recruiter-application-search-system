import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/search");
  redirect("/login");
}
