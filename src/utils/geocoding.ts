import * as Location from 'expo-location';

export interface GeocodedAddress {
  formattedAddress: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  suburb?: string;
}

/**
 * Reverse geocode with a 3-layer fallback chain:
 *   1. expo-location reverseGeocodeAsync (native iOS/Android, works offline)
 *   2. Google Geocoding API (requires API key in env)
 *   3. Nominatim (free, rate-limited, no key needed)
 *
 * Returns structured address + formatted string.
 * On total failure, returns a GPS-coordinate fallback so "Fetching location..." never reaches the user.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodedAddress> {
  // ---- LAYER 1: expo-location native geocoder ----
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const r = results[0];
      // Check for quality: Apple's CLGeocoder can return empty/trash data
      if (r.city || r.street || r.region) {
        const parts = [r.name, r.street, r.district, r.city, r.region, r.postalCode]
          .filter(Boolean) as string[];
        return {
          formattedAddress: parts.join(', '),
          street: r.street || r.name || undefined,
          city: r.city || r.subregion || undefined,
          state: r.region || undefined,
          pincode: r.postalCode || undefined,
          country: r.country || undefined,
          suburb: r.subregion || r.district || undefined,
        };
      }
      // If Apple returned trash, fall through
    }
  } catch {
    // fall through
  }

  // ---- LAYER 2: Google Geocoding API ----
  try {
    const GOOGLE_KEY = 'AIzaSyADDmG-kNKYDNa0eBoamy6nin03XkkcvWs';
    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}`,
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data.status === 'OK' && data.results?.[0]) {
        const addr = data.results[0];
        const components = addr.address_components || [];
        const findType = (types: string[]) =>
          components.find((c: any) => types.some((t) => c.types.includes(t)))?.long_name || '';

        return {
          formattedAddress: addr.formatted_address,
          street: [findType(['street_number']), findType(['route'])].filter(Boolean).join(' ') || undefined,
          city: findType(['locality', 'administrative_area_level_3', 'sublocality']),
          state: findType(['administrative_area_level_1']),
          pincode: findType(['postal_code']),
          country: findType(['country']),
          suburb: findType(['sublocality', 'neighborhood']),
        };
      }
    }
  } catch {
    // fall through
  }

  // ---- LAYER 3: Nominatim (free fallback) ----
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'SpinZoApp/1.0' } },
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data?.address) {
        const a = data.address;
        const formatted = data.display_name || '';
        return {
          formattedAddress: formatted,
          street: [a.house_number, a.road].filter(Boolean).join(' ') || undefined,
          city: a.city || a.town || a.village || a.county || undefined,
          state: a.state || undefined,
          pincode: a.postcode || undefined,
          country: a.country || undefined,
          suburb: a.suburb || a.neighbourhood || undefined,
        };
      }
    }
  } catch {
    // fall through
  }

  // ---- LAST RESORT: GPS coordinates ----
  return {
    formattedAddress: `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    street: undefined,
    city: undefined,
    state: undefined,
    pincode: undefined,
    country: undefined,
    suburb: undefined,
  };
}

/**
 * Parse a Nominatim or Geocoding response that already has address_components
 * into a GeocodedAddress. Useful when the calling code already has the raw data.
 */
export function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  formattedAddress: string,
): GeocodedAddress {
  const findType = (types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || '';

  return {
    formattedAddress,
    street: [findType(['street_number']), findType(['route'])].filter(Boolean).join(' ') || undefined,
    city: findType(['locality', 'administrative_area_level_3', 'sublocality']),
    state: findType(['administrative_area_level_1']),
    pincode: findType(['postal_code']),
    country: findType(['country']),
    suburb: findType(['sublocality', 'neighborhood']),
  };
}
