import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If there's an error (network failure, DNS error, etc.),
    // allow the request through — don't redirect to login.
    // The client-side will handle the offline state gracefully.
    if (error) {
      return response;
    }

    const isAuthPage =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/register") ||
      request.nextUrl.pathname.startsWith("/verify-email");

    const isTotpVerifyPage = request.nextUrl.pathname === "/login/verify-totp";
    const isPublicPage = request.nextUrl.pathname === "/";

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
    if (!user && !isAuthPage && !isPublicPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // Unexpected error — allow the request through.
  }

  return response;
}
