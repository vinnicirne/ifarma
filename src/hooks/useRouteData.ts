import { useState, useEffect } from 'react';

interface RouteData {
    coordinates: [number, number][]; // Lat, Lng pairs for Leaflet
    distance: number; // in meters
    duration: number; // in seconds
    isLoading: boolean;
    error: string | null;
}

export const useRouteData = (
    origin: { lat: number; lng: number } | null,
    destination: { lat: number; lng: number } | null
): RouteData => {
    const [coordinates, setCoordinates] = useState<[number, number][]>([]);
    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!origin || !destination) {
            setCoordinates([]);
            return;
        }

        const cacheKey = `route_${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}`;

        const fetchRoute = async () => {
            setIsLoading(true);
            setError(null);

            // 1. Tentar carregar do Cache primeiro (Offline First)
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Validade de 2 horas para o cache
                    if (Date.now() - parsed.timestamp < 1000 * 60 * 60 * 2) {
                        setCoordinates(parsed.coordinates);
                        setDistance(parsed.distance);
                        setDuration(parsed.duration);
                        // Se tiver cache, não retornamos e deixamos tentar buscar atualizado (Stale-While-Revalidate)
                        // Exceto se quisermos economizar dados. Vamos fazer SWR.
                    }
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }

            try {
                // OSRM expects {lng},{lat}
                const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                    throw new Error('Não foi possível calcular a rota.');
                }

                const route = data.routes[0];

                // OSRM returns [lng, lat], Leaflet needs [lat, lng]
                const coords = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);

                setCoordinates(coords);
                setDistance(route.distance);
                setDuration(route.duration);

                // 2. Salvar no Cache
                localStorage.setItem(cacheKey, JSON.stringify({
                    coordinates: coords,
                    distance: route.distance,
                    duration: route.duration,
                    timestamp: Date.now()
                }));

            } catch (err: any) {
                console.error("Erro ao buscar rota (online):", err);

                // Se falhou e já tínhamos carregado o cache, silenciosamente ignoramos o erro (mantendo o cache)
                // Se NÃO tínhamos cache, aí sim mostramos erro.
                const hasCache = !!coordinates.length;
                if (!hasCache) {
                    setError(err.message || 'Erro de conexão. Verifique sua internet.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoute();

    }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

    return { coordinates, distance, duration, isLoading, error };
};
