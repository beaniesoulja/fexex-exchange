import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const usernamePattern = /^[a-z0-9_]{3,24}$/;

function createSuggestions(username: string) {
  const base = username.slice(0, 21);

  return Array.from({ length: 100 }, (_, index) => `${base}${index + 1}`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = (searchParams.get("username") ?? "").trim().toLowerCase();

  if (!usernamePattern.test(username)) {
    return NextResponse.json(
      { available: false, valid: false, suggestions: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const suggestions = createSuggestions(username);
    const users = await prisma.user.findMany({
      where: { username: { in: [username, ...suggestions] } },
      select: { username: true },
    });
    const unavailable = new Set(users.flatMap((user) => user.username ? [user.username] : []));

    return NextResponse.json(
      {
        available: !unavailable.has(username),
        valid: true,
        suggestions: unavailable.has(username) ? suggestions.filter((suggestion) => !unavailable.has(suggestion)).slice(0, 3) : [],
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Username availability check failed:", error);
    return NextResponse.json({ error: "Could not check username availability." }, { status: 500 });
  }
}
