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

/** A closed fence. The ring is checked as-is; the closing point is optional. */
interface ServiceArea {
    id: string;
    name: string;
    ring: Coordinate[];
}

/**
 * Converts a GeoJSON ring into app coordinates.
 *
 * Fences are drawn in My Maps / geojson.io, which export a closed ring (first
 * point repeated) tagged `"LineString"` — the ring shape is what matters here.
 * GeoJSON orders pairs [longitude, latitude], the reverse of this module.
 */
export const ringFromGeoJson = (coordinates: number[][]): Coordinate[] =>
    coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));

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
 * Standalone pockets we serve that sit outside NEW_MAP_POLYGON — typically one
 * building or plot too far from the main fence to be part of it. Each ring is
 * tested on its own, so a pocket can be added or removed without disturbing the
 * main boundary.
 */
export const EXTRA_SERVICE_AREAS: ServiceArea[] = [
    {
        id: 'nischay_home',
        name: 'Nischay Home',
        // ~862 m south of the main fence. 93 m x 65 m.
        ring: ringFromGeoJson([
            [77.614182565, 12.883565086],
            [77.614012245, 12.883206874],
            [77.614751193, 12.882980703],
            [77.614874575, 12.883406897],
            [77.614182565, 12.883565086],
        ]),
    },
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

const METERS_PER_DEGREE_LAT = 111320;

/** Length of one degree of longitude, in metres, at the given latitude. */
const metersPerDegreeLng = (latitude: number): number =>
    METERS_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180);

/**
 * Shortest distance from `point` to the segment a→b, in metres. Longitude is
 * scaled to the point's own parallel so the projection is locally square.
 */
const distanceToSegmentMeters = (point: Coordinate, a: Coordinate, b: Coordinate): number => {
    const lngScale = metersPerDegreeLng(point.latitude);
    const px = (point.longitude - a.longitude) * lngScale;
    const py = (point.latitude - a.latitude) * METERS_PER_DEGREE_LAT;
    const bx = (b.longitude - a.longitude) * lngScale;
    const by = (b.latitude - a.latitude) * METERS_PER_DEGREE_LAT;

    const lengthSq = bx * bx + by * by;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq));

    return Math.hypot(px - bx * t, py - by * t);
};

/**
 * Address pins land on fence edges all the time, and a point exactly on a
 * boundary is a coin-flip for ray casting (a vertex can test either way). The
 * rider can walk this far, so treat it as inside.
 */
export const SERVICE_EDGE_TOLERANCE_METERS = 15;

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

    if (inside) return true;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (distanceToSegmentMeters(point, polygon[j], polygon[i]) <= SERVICE_EDGE_TOLERANCE_METERS) {
            return true;
        }
    }

    return false;
};

/**
 * Checks if a location is inside any area we serve — the main fence or one of
 * the standalone pockets.
 * @returns {boolean} True if serviceable, False otherwise.
 */
export const isLocationServiceable = (location: Coordinate): boolean => {
    if (isPointInPolygon(location, NEW_MAP_POLYGON)) return true;
    return EXTRA_SERVICE_AREAS.some((area) => isPointInPolygon(location, area.ring));
};

/**
 * Returns the name of the service zone the location belongs to, or null if unserviceable.
 */
export const getServiceZoneName = (location: Coordinate): string | null => {
    if (isPointInPolygon(location, NEW_MAP_POLYGON)) return 'SpinZo Service Area';

    const pocket = EXTRA_SERVICE_AREAS.find((area) => isPointInPolygon(location, area.ring));
    return pocket ? pocket.name : null;
};

export interface NearestZoneInfo {
    nearestZoneName: string;
    distanceMeters: number;
    distanceKm: number;
    formattedDistance: string;
    feasibility: 'near' | 'moderate' | 'far'; // <1.5km = near, 1.5-4km = moderate, >4km = far
}

/**
 * Calculates the shortest distance from an unserviceable location to the nearest service zone boundary.
 */
export const getNearestZoneInfo = (location: Coordinate): NearestZoneInfo => {
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        return {
            nearestZoneName: 'Unknown',
            distanceMeters: 0,
            distanceKm: 0,
            formattedDistance: 'N/A',
            feasibility: 'far',
        };
    }

    let minDistance = Infinity;
    let nearestZone = SERVICE_ZONES[0];

    for (const zone of SERVICE_ZONES) {
        const centerDist = calculateDistance(location, zone.center);
        // Distance to zone perimeter (buffer zone)
        const edgeDist = Math.max(0, centerDist - zone.radiusMeters);
        if (edgeDist < minDistance) {
            minDistance = edgeDist;
            nearestZone = zone;
        }
    }

    const distanceKm = Number((minDistance / 1000).toFixed(1));
    const formattedDistance = minDistance < 1000
        ? `${Math.round(minDistance)}m`
        : `${distanceKm} km`;

    let feasibility: 'near' | 'moderate' | 'far' = 'far';
    if (minDistance <= 1500) {
        feasibility = 'near';
    } else if (minDistance <= 4000) {
        feasibility = 'moderate';
    }

    return {
        nearestZoneName: nearestZone ? nearestZone.name : 'Service Area',
        distanceMeters: Math.round(minDistance),
        distanceKm,
        formattedDistance,
        feasibility,
    };
};

