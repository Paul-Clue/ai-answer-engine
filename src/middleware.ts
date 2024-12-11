// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ratelimit } from "./lib/ratelimiter";

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || 
  request.headers.get("cf-connecting-ip") || 
  "127.0.0.1";
  // const ip = request.ip || "127.0.0.1";
  try {
    
    // const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip);
    // console.log("MIDDLEWARE RAN", success, pending, limit, reset, remaining);
    console.log("IP", ip);

    // if (!success) {
    //   console.log("limit", limit);
    //   console.log("reset", reset);
    //   console.log("remaining", remaining);
    //   // return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    // }

    const response = NextResponse.next();

    return response;



  } catch (error) {
    console.log("MIDDLEWARE RAN4");

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
