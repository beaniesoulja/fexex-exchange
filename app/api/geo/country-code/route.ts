import { NextResponse } from "next/server";

import { getCountryCallingCode } from "@/lib/country-calling-codes";

export function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");

  return NextResponse.json(
    { countryCode: getCountryCallingCode(country) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
