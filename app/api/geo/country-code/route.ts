import { NextResponse } from "next/server";

import { getCountryCallingCode } from "@/lib/country-calling-codes";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = await enforceRateLimit(`geo:${getClientIp(request)}`, RATE_LIMITS.publicRead);
  if (limited) return limited;

  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");

  return NextResponse.json(
    { countryCode: getCountryCallingCode(country) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
