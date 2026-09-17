/**
 * Geofencing Utility
 * 
 * Defines service zones and provides functions to check if a location is serviceable.
 * Uses the Haversine formula for spherical distance calculation.
 */

export interface Coordinate {
    latitude: number;
    longitude: number;
}

interface ServiceZone {
    id: string;
    name: string;
    center: Coordinate;
    radiusMeters: number;
}

// Service Zones updated based on user map:
// Added 100m buffer to each radius for better edge coverage
export const SERVICE_ZONES: ServiceZone[] = [
    {
        id: 'jayanagar_area',
        name: 'Jayanagar & Surroundings',
        center: { latitude: 12.9170047, longitude: 77.5883353 },
        radiusMeters: 3100, // 3000 + 100
    },
    {
        id: 'hsr_area',
        name: 'HSR Layout',
        center: { latitude: 12.9181432, longitude: 77.623322 },
        radiusMeters: 2100, // 2000 + 100
    },
    {
        id: 'hsr_ext',
        name: 'HSR Extension / Kudlu',
        center: { latitude: 12.9123289, longitude: 77.6434815 },
        radiusMeters: 1600, // 1500 + 100
    },
    {
        id: 'koramangala',
        name: 'Koramangala / Inner Ring',
        center: { latitude: 12.9374402, longitude: 77.6176586 },
        radiusMeters: 1600, // 1500 + 100
    },
    {
        id: 'wilson_garden',
        name: 'Wilson Garden',
        center: { latitude: 12.9455512, longitude: 77.5974994 },
        radiusMeters: 1100, // 1000 + 100
    },
    {
        id: 'shanti_nagar',
        name: 'Shanti Nagar',
        center: { latitude: 12.9541732, longitude: 77.5940298 },
        radiusMeters: 1100, // 1000 + 100
    },
    {
        id: 'begur',
        name: 'Begur / Bommanahalli',
        center: { latitude: 12.8959262, longitude: 77.6211877 },
        radiusMeters: 2100, // 2000 + 100
    },
    {
        id: 'adugodi_surroundings',
        name: 'Adugodi / Central East',
        center: { latitude: 12.9432328, longitude: 77.6077182 },
        radiusMeters: 3100, // 3000 + 100
    },
];

// Precise Polygon boundaries for SpinZo Service Area (Map Coordinates)
export const NEW_MAP_POLYGON: Coordinate[] = [
    { latitude: 12.894226891, longitude: 77.599241985 },
    { latitude: 12.899455983, longitude: 77.60076548 },
    { latitude: 12.9022169, longitude: 77.601194633 },
    { latitude: 12.905417016, longitude: 77.601838363 },
    { latitude: 12.907560861, longitude: 77.600465072 },
    { latitude: 12.911953077, longitude: 77.599912534 },
    { latitude: 12.920298065, longitude: 77.600191484 },
    { latitude: 12.932093512, longitude: 77.600620638 },
    { latitude: 12.936527118, longitude: 77.601736437 },
    { latitude: 12.944453038, longitude: 77.602723488 },
    { latitude: 12.943992965, longitude: 77.607487092 },
    { latitude: 12.943700192, longitude: 77.630575547 },
    { latitude: 12.938597502, longitude: 77.63276423 },
    { latitude: 12.920486294, longitude: 77.655681024 },
    { latitude: 12.905866705, longitude: 77.654393562 },
    { latitude: 12.90350323, longitude: 77.64999474 },
    { latitude: 12.90350323, longitude: 77.648728738 },
    { latitude: 12.899612858, longitude: 77.648728738 },
    { latitude: 12.899320032, longitude: 77.645166765 },
    { latitude: 12.896559083, longitude: 77.645424257 },
    { latitude: 12.893839937, longitude: 77.644866358 },
    { latitude: 12.892292103, longitude: 77.644866358 },
    { latitude: 12.891999268, longitude: 77.64411534 },
    { latitude: 12.890702424, longitude: 77.64411534 },
    { latitude: 12.889238238, longitude: 77.640210043 },
    { latitude: 12.8925431, longitude: 77.59892012 },
    { latitude: 12.894226891, longitude: 77.599241985 }, // closes loop
];

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 */
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371e3; // Earth's radius in meters
    const lat1 = (coord1.latitude * Math.PI) / 180;
    const lat2 = (coord2.latitude * Math.PI) / 180;
    const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Checks if a coordinate is inside a polygon using the Ray-Casting algorithm.
 */
export const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
    const x = point.longitude;
    const y = point.latitude;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;

        const intersect = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

/**
 * Checks if a location is inside the defined polygon service zone.
 * @returns {boolean} True if serviceable, False otherwise.
 */
export const isLocationServiceable = (location: Coordinate): boolean => {
    return isPointInPolygon(location, NEW_MAP_POLYGON);
};

/**
 * Returns the name of the service zone the location belongs to, or null if unserviceable.
 */
export const getServiceZoneName = (location: Coordinate): string | null => {
    return isLocationServiceable(location) ? 'SpinZo Service Area' : null;
};
