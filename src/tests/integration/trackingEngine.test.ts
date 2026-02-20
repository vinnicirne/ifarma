import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper function duplicated from tracking-engine/index.ts for logic verification
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Logic replication of tracking-engine
async function simulateTrackingEngine(body: any, mockSupabase: any) {
    const { motoboyId, latitude, longitude, orderId, batteryLevel, isCharging } = body;

    if (!motoboyId || !latitude || !longitude) {
        return { status: 400, error: 'Motoboy ID e coordenadas são obrigatórios' };
    }

    const updatePayload: any = {
        last_lat: latitude,
        last_lng: longitude,
        updated_at: new Date().toISOString()
    };

    if (batteryLevel !== undefined) updatePayload.battery_level = batteryLevel;
    if (isCharging !== undefined) updatePayload.is_charging = isCharging;

    const { error: profileError } = await mockSupabase.from('profiles').update(updatePayload).eq('id', motoboyId);
    if (profileError) return { status: 500, error: 'Erro ao atualizar perfil' };

    const { error: historyError } = await mockSupabase.from('route_history').insert({
        motoboy_id: motoboyId,
        order_id: orderId || null,
        latitude: latitude,
        longitude: longitude,
    });
    if (historyError) return { status: 500, error: 'Erro ao inserir histórico de rota' };

    if (orderId) {
        const { data: order } = await mockSupabase
            .from('orders')
            .select('delivery_lat, delivery_lng, customer_id')
            .eq('id', orderId)
            .single();

        if (order?.delivery_lat && order?.delivery_lng) {
            const dist = calculateDistance(latitude, longitude, order.delivery_lat, order.delivery_lng);
            if (dist < 0.2) {
                return { success: true, nearDestination: true };
            }
        }
    }

    return { success: true };
}

describe('Integration: Tracking Engine Logic', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: null, error: null }),
        };
    });

    it('deve atualizar perfil e inserir histórico corretamente', async () => {
        const body = {
            motoboyId: 'moto-1',
            latitude: -22.9,
            longitude: -43.1,
            batteryLevel: 85,
            isCharging: false
        };

        const result = await simulateTrackingEngine(body, mockSupabase);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
            last_lat: -22.9,
            battery_level: 85
        }));
        expect(mockSupabase.from).toHaveBeenCalledWith('route_history');
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
            motoboy_id: 'moto-1'
        }));
    });

    it('deve detectar proximidade do destino', async () => {
        const body = {
            motoboyId: 'moto-1',
            latitude: -22.9001, // Próximo ao destino
            longitude: -43.1001,
            orderId: 'order-123'
        };

        mockSupabase.single.mockResolvedValue({
            data: { delivery_lat: -22.9, delivery_lng: -43.1 },
            error: null
        });

        const result = await simulateTrackingEngine(body, mockSupabase);

        expect(result.success).toBe(true);
        expect(result.nearDestination).toBe(true);
    });

    it('deve retornar erro 400 se faltarem dados obrigatórios', async () => {
        const result = await simulateTrackingEngine({ motoboyId: 'moto-1' }, mockSupabase);
        expect(result.status).toBe(400);
        expect(result.error).toContain('obrigatórios');
    });
});
