import { useState, useEffect } from 'react';

interface DirectionsResult {
    distance: string;
    duration: string;
    distanceValue: number;
    durationValue: number;
}

export const useDirections = (
    origin: { lat: number; lng: number } | null,
    destination: { lat: number; lng: number } | null,
    enabled: boolean = true
) => {
    const [result, setResult] = useState<DirectionsResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || !origin || !destination || !window.google) {
            return;
        }

        const calculateRoute = async () => {
            setLoading(true);
            setError(null);

            try {
                const directionsService = new google.maps.DirectionsService();

                const request: google.maps.DirectionsRequest = {
                    origin: new google.maps.LatLng(origin.lat, origin.lng),
                    destination: new google.maps.LatLng(destination.lat, destination.lng),
                    travelMode: google.maps.TravelMode.DRIVING,
                    drivingOptions: {
                        departureTime: new Date(),
                        trafficModel: google.maps.TrafficModel.BEST_GUESS
                    }
                };

                const response = await directionsService.route(request);

                if (response.routes[0]?.legs[0]) {
                    const leg = response.routes[0].legs[0];
                    setResult({
                        distance: leg.distance?.text || '',
                        duration: leg.duration?.text || '',
                        distanceValue: leg.distance?.value || 0,
                        durationValue: leg.duration?.value || 0
                    });
                }
            } catch (err: any) {
                console.error('Erro ao calcular rota:', err);
                setError(err.message || 'Erro ao calcular rota');
            } finally {
                setLoading(false);
            }
        };

        calculateRoute();
    }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, enabled]);

    return { result, loading, error };
};
