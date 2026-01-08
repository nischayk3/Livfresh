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

// Service Zones derived from:
// https://www.mapdevelopers.com/draw-circle-tool.php?circles=%5B%5B3000%2C12.9170243%2C77.5881958%2C%22%23AAAAAA%22%2C%22%23000000%22%2C0.4%5D%2C%5B3353.92%2C12.9164386%2C77.6204467%2C%22%23AAAAAA%22%2C%22%23000000%22%2C0.4%5D%2C%5B1752.81%2C12.9092895%2C77.6432908%2C%22%23AAAAAA%22%2C%22%23000000%22%2C0.4%5D%5D
export const SERVICE_ZONES: ServiceZone[] = [
    {
        id: 'jayanagar_area',
        name: 'Jayanagar & Surroundings',
        center: { latitude: 12.9170243, longitude: 77.5881958 },
        radiusMeters: 3000,
    },
    {
        id: 'hsr_area',
        name: 'HSR Layout',
        center: { latitude: 12.9164386, longitude: 77.6204467 },
        radiusMeters: 3353.92,
    },
    {
        id: 'hsr_ext',
        name: 'HSR Extension / Kudlu',
        center: { latitude: 12.9092895, longitude: 77.6432908 },
        radiusMeters: 1752.81,
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

/**
 * Checks if a location is inside any of the defined service zones.
 * @returns {boolean} True if serviceable, False otherwise.
 */
export const isLocationServiceable = (location: Coordinate): boolean => {
    return SERVICE_ZONES.some(zone => {
        const distance = calculateDistance(location, zone.center);
        return distance <= zone.radiusMeters;
    });
};

/**
 * Returns the name of the service zone the location belongs to, or null if unserviceable.
 */
export const getServiceZoneName = (location: Coordinate): string | null => {
    const zone = SERVICE_ZONES.find(z => {
        const distance = calculateDistance(location, z.center);
        return distance <= z.radiusMeters;
    });
    return zone ? zone.name : null;
};
