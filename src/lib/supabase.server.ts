import { createServerClient } from "@supabase/ssr";
import { getCookies, getRequestHost, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { cookieOptionsForHost } from "@/lib/auth-cookies";

export function createSupabaseServerClient() {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!url || !key) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  const hostname = getRequestHost({ xForwardedHost: true });
  const baseOpts = cookieOptionsForHost(hostname);

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        const cookies = getCookies();
        return Object.entries(cookies).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          if (value === "" || value == null) {
            deleteCookie(name, { ...baseOpts, ...options });
          } else {
            setCookie(name, value, { ...baseOpts, ...options });
          }
        }
      },
    },
  });
}
