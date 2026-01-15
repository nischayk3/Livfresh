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
