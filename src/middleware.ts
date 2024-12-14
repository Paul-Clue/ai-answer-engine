import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ratelimit } from "./lib/ratelimiter";

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1";
  // const ip = request.ip || "127.0.0.1";
  try {
    console.log("Ratelimit middleware ran");
    // const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip);
    const { success, limit, remaining } = await ratelimit.limit(ip);
    if (!success) {
      console.log("TOO MANY REQUESTS");
      return NextResponse.json(
        { message: "Too many requests" },
        { status: 429 }
      );
    }

    // console.log("Pending: ", pending);
    // console.log("Reset: ", reset);
    console.log("Limit: ", limit);
    console.log("Remaining: ", remaining);

    const response = NextResponse.next();

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Too many requests: " + error },
      { status: 429 }
    );
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
