export interface RouteInfo {
    distance: string; // text representation (e.g. "2.5 km")
    duration: string; // text representation (e.g. "8 min")
    distanceValue: number; // in meters
    durationValue: number; // in seconds
}

export const getRealTimeRoute = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    apiKey: string
): Promise<RouteInfo | null> => {
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&departure_time=now&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
            const element = data.rows[0].elements[0];
            return {
                distance: element.distance.text,
                duration: element.duration_in_traffic ? element.duration_in_traffic.text : element.duration.text,
                distanceValue: element.distance.value,
                durationValue: element.duration_in_traffic ? element.duration_in_traffic.value : element.duration.value,
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching real-time route:', error);
        return null;
    }
};
