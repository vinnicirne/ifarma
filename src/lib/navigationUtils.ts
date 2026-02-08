/**
 * Utilitários de Geometria para Navegação Premium
 */

// Calcula o ângulo (bearing) entre dois pontos para saber para onde o motoboy está apontando
export const calculateHeading = (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
) => {
    const dLon = (endLng - startLng) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(endLat * (Math.PI / 180));
    const x = Math.cos(startLat * (Math.PI / 180)) * Math.sin(endLat * (Math.PI / 180)) -
        Math.sin(startLat * (Math.PI / 180)) * Math.cos(endLat * (Math.PI / 180)) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
};

// Interpolação Linear (LERP) para suavizar movimento
export const lerp = (start: number, end: number, amt: number) => {
    return (1 - amt) * start + amt * end;
};

// Calcula distância entre ponto e uma rota (Polyline) - Simplificado para detecção de desvio
export const getDistanceToRoute = (point: { lat: number, lng: number }, path: any[]) => {
    if (!path || path.length < 2) return 0;
    // No Google Maps JS, o ideal é usar a biblioteca geometry:
    // google.maps.geometry.poly.isLocationOnEdge(point, poly, tolerance)
    return 0; // Placeholder para lógica nativa do Google
};
