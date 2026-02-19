import { calculateDistance } from './geoUtils';

function hashToFloat(input: string) {
    // hash simples determinístico (0..1)
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
}

export function rankPharmaciesIfoodStyle(pharmacies: any[], userLocation: { lat: number, lng: number } | null) {
    const list = Array.isArray(pharmacies) ? pharmacies : [];
    if (list.length === 0) return [];

    const referenceLoc = userLocation || { lat: -22.8269, lng: -43.0539 };
    const now = new Date();
    const bucket = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
    // muda a cada hora (rotação controlada, não “bagunça” a cada refresh)

    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const scored = list.map(p => {
        // distância
        let distance = Infinity;
        if (p.latitude && p.longitude) {
            distance = calculateDistance(
                referenceLoc.lat,
                referenceLoc.lng,
                Number(p.latitude),
                Number(p.longitude)
            );
        }
        const distKm = distance === Infinity ? 99 : distance / 1000;

        // aberto/fechado (mesma lógica do App)
        let isOpen = false;
        if (p.is_open) isOpen = true;
        else if (p.auto_open_status && Array.isArray(p.opening_hours) && p.opening_hours.length > 0) {
            const todayRule = p.opening_hours.find((h: any) => h.day === currentDay);
            if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
                const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
                const [hClose, mClose] = todayRule.close.split(':').map(Number);
                const openVal = hOpen * 60 + mOpen;
                const closeVal = hClose * 60 + mClose;
                if (currentTime >= openVal && currentTime < closeVal) isOpen = true;
            }
        }

        const plan = (p.plan || '').toLowerCase();
        const isFeatured = p.is_featured === true || ['premium', 'pro', 'destaque'].includes(plan);

        // Score base (sem random maluco)
        const scoreProx = Math.max(0, 100 - (distKm * 6));
        const avgTime = (Number(p.delivery_time_min || 30) + Number(p.delivery_time_max || 60)) / 2;
        const scoreTime = Math.max(0, 100 - (avgTime * 1.5));
        const scoreSla = p.sla_score !== undefined ? Number(p.sla_score) : 100;
        const scoreRating = (Number(p.rating) || 5) * 20;
        const scorePromo = isFeatured ? 100 : 0;

        let score =
            (scoreProx * 0.35) +
            (scoreTime * 0.25) +
            (scoreSla * 0.20) +
            (scoreRating * 0.15) +
            (scorePromo * 0.05);

        // Tiers estilo iFood: patrocinado + aberto + orgânico
        if (isFeatured) score += 3000;   // sobe, mas sem “explodir” a fila
        if (p.is_sponsored) score += 1500;
        if (isOpen) score += 800; else score -= 200;

        // rotação controlada (determinística): muda por “bucket” (hora), mas não fica doido
        const rot = hashToFloat(`${p.id}-${bucket}`) * 10; // Reduzido de 30 para 10 para evitar saltos drásticos
        score += rot;

        // Garantir que lojas abertas sempre estejam no topo se a diferença de score não for absurda
        if (isOpen) score += 5000;
        else score -= 1000;

        return { ...p, distance, isOpen, is_featured: isFeatured, score };
    });

    // iFood costuma intercalar patrocinados e orgânicos:
    const featured = scored.filter(p => p.is_featured).sort((a: any, b: any) => b.score - a.score);
    const organic = scored.filter(p => !p.is_featured).sort((a: any, b: any) => b.score - a.score);

    const result: any[] = [];
    const slots = new Set([0, 3, 7]); // patrocinado nas posições 1, 4, 8 (ajuste como quiser)

    let fi = 0, oi = 0;
    for (let i = 0; i < featured.length + organic.length; i++) {
        const useFeatured = slots.has(i) && fi < featured.length;
        if (useFeatured) result.push(featured[fi++]);
        else if (oi < organic.length) result.push(organic[oi++]);
        else if (fi < featured.length) result.push(featured[fi++]);
    }

    return result;
}
