import { createServerFn } from "@tanstack/react-start";
import { createSupabaseServerClient } from "@/lib/supabase.server";

export type PlayableUser = { id: string };

/** Signed-in, non-anonymous user — same rule as KruMath RequireLoggedIn. */
export const fetchPlayableUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlayableUser | null> => {
    const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
    const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
    if (!url || !key) return null;

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    if (data.user.is_anonymous) return null;
    return { id: data.user.id };
  },
);
