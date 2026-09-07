import { createBrowserClient } from "@supabase/ssr";
import { cookieOptionsForHost } from "@/lib/krumathCookies";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!url || !key) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  browserClient = createBrowserClient(url, key, {
    cookieOptions: cookieOptionsForHost(hostname),
  });
  return browserClient;
}
