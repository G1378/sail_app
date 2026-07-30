// Uses Open-Meteo's free geocoding API — same provider as the weather feed,
// no API key required. https://open-meteo.com/en/docs/geocoding-api
export interface GeocodeResult {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    name: q,
    count: "5",
    language: "en",
    format: "json",
  });

  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) throw new Error(`Location search failed: HTTP ${res.status}`);

  const json = await res.json();
  const results: any[] = json.results ?? [];

  return results.map((r) => ({
    name: r.name as string,
    admin1: r.admin1 as string | undefined,
    country: r.country as string,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
  }));
}

/** A short "Town, Region, Country" style label for a geocode result */
export function formatGeocodeResult(r: GeocodeResult): string {
  return [r.name, r.admin1, r.country].filter(Boolean).join(", ");
}
