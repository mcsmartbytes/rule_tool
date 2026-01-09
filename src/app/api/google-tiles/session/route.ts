import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GoogleCreateSessionResponse = {
  session: string;
  expiry: string;
};

export async function POST() {
  const key = process.env.GOOGLE_MAP_TILES_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing GOOGLE_MAP_TILES_API_KEY" }, { status: 500 });
  }

  const body = {
    mapType: "satellite",
    language: "en-US",
    region: "US",
  };

  const res = await fetch(
    `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Google createSession failed", status: res.status, details: text.slice(0, 600) },
      { status: 500 }
    );
  }

  const data = (await res.json()) as GoogleCreateSessionResponse;

  const tileUrlTemplate =
    `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}` +
    `?session=${encodeURIComponent(data.session)}` +
    `&key=${encodeURIComponent(key)}`;

  return NextResponse.json({
    session: data.session,
    expiry: data.expiry,
    tileUrlTemplate,
    attributionText: "Data © Google",
    requiresGoogleLogo: true,
  });
}
