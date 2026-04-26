import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Cron Job - Supabase Keep-Alive
 *
 * This endpoint is called automatically by Vercel Cron every day
 * to prevent the Supabase database from going inactive due to
 * inactivity on the free tier (pauses after 7 days of no requests).
 *
 * Configured in vercel.json with the cron schedule.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Simple lightweight query to keep the database active
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("[Cron Keep-Alive] Supabase query failed:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    console.log(
      `[Cron Keep-Alive] Supabase pinged successfully at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: "Supabase keep-alive ping successful",
      timestamp: new Date().toISOString(),
      rowsReturned: data?.length ?? 0,
    });
  } catch (err) {
    console.error("[Cron Keep-Alive] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error during keep-alive ping",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
