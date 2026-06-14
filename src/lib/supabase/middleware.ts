import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCachedAppSettings } from "@/lib/admin/settings";
import { verifyAccessToken } from "@/lib/auth/jwt";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Allow API routes and callback without auth check
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isCallbackRoute = request.nextUrl.pathname.startsWith("/auth/callback");
  if (isApiRoute || isCallbackRoute) {
    return response;
  }

  try {
    // Verify the session locally instead of a network round-trip to Supabase
    // Auth on every navigation. getSession reads the cookie locally AND still
    // refreshes an expired token when needed — and because our cookies.set
    // callback above re-writes the refreshed token onto `response`, the SSR
    // refresh behavior is preserved. We then verify the JWT signature locally
    // (jose), so trusting the resulting claims is safe.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const verified = session
      ? await verifyAccessToken(session.access_token)
      : null;
    const user = verified ? { id: verified.userId } : null;

    const isAuthPage =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/register") ||
      request.nextUrl.pathname.startsWith("/verify-email") ||
      request.nextUrl.pathname.startsWith("/forgot-password") ||
      request.nextUrl.pathname.startsWith("/reset-password");

    const isTotpVerifyPage = request.nextUrl.pathname === "/login/verify-totp";
    const isPublicPage = request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/docs");

    // Handle TOTP pending state
    const totpPending = request.cookies.get("totp_pending")?.value === "true";

    if (user && totpPending) {
      // User is authenticated but TOTP verification is pending
      if (isTotpVerifyPage) {
        // Allow access to the TOTP verification page
        return response;
      }
      // Redirect all other protected routes to TOTP verification
      if (!isAuthPage && !isPublicPage) {
        return NextResponse.redirect(
          new URL("/login/verify-totp", request.url)
        );
      }
    }

    // Redirect authenticated users away from auth pages
    // (but allow verify-totp page when totp is pending)
    if (user && isAuthPage && !isTotpVerifyPage) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    // If user is authenticated, not totp_pending, and on verify-totp page,
    // redirect to chat (they don't need verification)
    if (user && !totpPending && isTotpVerifyPage) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    // Redirect unauthenticated users to login
    if (
      !user &&
      !isAuthPage &&
      !isPublicPage &&
      request.nextUrl.pathname !== "/maintenance"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Admin area — first line of defense. Only role='admin' may proceed.
    // The admin layout re-verifies server-side; this keeps the area
    // invisible to normal users by bouncing them to /chat.
    if (user && request.nextUrl.pathname.startsWith("/setuabhiadmin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_banned")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin" || profile.is_banned) {
        return NextResponse.redirect(new URL("/chat", request.url));
      }
    }

    // Maintenance mode — when enabled, only admins may use the app. Everyone
    // else is parked on /maintenance. Auth/public pages and the admin area
    // stay reachable so admins can sign in and turn it back off.
    const pathname = request.nextUrl.pathname;
    const isMaintenancePage = pathname === "/maintenance";
    const settings = await getCachedAppSettings(supabase);

    if (settings.maintenance_mode) {
      const exempt =
        isAuthPage ||
        isPublicPage ||
        isMaintenancePage ||
        pathname.startsWith("/setuabhiadmin");

      if (!exempt) {
        let isAdmin = false;
        if (user) {
          const { data: p } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          isAdmin = p?.role === "admin";
        }
        if (!isAdmin) {
          return NextResponse.redirect(new URL("/maintenance", request.url));
        }
      }
    } else if (isMaintenancePage) {
      // Maintenance is off — don't let the page linger.
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  } catch {
    // Unexpected error — allow the request through.
  }

  return response;
}
