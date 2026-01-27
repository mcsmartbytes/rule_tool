type GoogleSessionPayload = {
  session: string;
  expiry: string;
  tileUrlTemplate: string;
  attributionText: string;
  requiresGoogleLogo: boolean;
};

let cached: GoogleSessionPayload | null = null;

function isExpired(expiryIso: string) {
  const exp = new Date(expiryIso).getTime();
  // Refresh 60 seconds early
  return Date.now() > exp - 60_000;
}

export async function getGoogleTilesSession(): Promise<GoogleSessionPayload> {
  if (cached && !isExpired(cached.expiry)) return cached;

  const res = await fetch("/api/google-tiles/session", { method: "POST" });
  if (!res.ok) throw new Error(`Session fetch failed: ${res.status}`);

  cached = (await res.json()) as GoogleSessionPayload;
  return cached;
}

export function clearGoogleTilesSessionCache() {
  cached = null;
}
