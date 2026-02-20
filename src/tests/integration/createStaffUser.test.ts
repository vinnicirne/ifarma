import { describe, it, expect, vi, beforeEach } from 'vitest';

// Logic replication of create-staff-user
async function simulateCreateStaffUser(req: any, mockSupabaseAdmin: any) {
    const authHeader = req.headers.Authorization;
    if (!authHeader) return { status: 401, error: "No auth" };

    const body = req.body;
    const { email, password, metadata } = body;
    const pharmacy_id = body.pharmacy_id || metadata?.pharmacy_id;

    // 1. Check requester
    const { data: requesterProfile } = await mockSupabaseAdmin.from("profiles").select("*").eq("id", "requester-1").single();
    if (!requesterProfile) return { status: 403, error: "Profile not found" };

    const isAdmin = requesterProfile.role === "admin";
    const requestedRole = metadata?.role || "merchant";

    // 2. Permission check
    if (!isAdmin) {
        if (!requesterProfile.pharmacy_id) return { status: 403, error: "Unauthorized" };
        if (pharmacy_id && pharmacy_id !== requesterProfile.pharmacy_id) return { status: 403, error: "Unauthorized farm" };
    }

    // 3. Role requirements
    if (["merchant", "staff", "motoboy"].includes(requestedRole) && !pharmacy_id) {
        return { status: 400, error: "pharmacy_id required" };
    }

    // 4. Validate pharmacy exists
    if (pharmacy_id) {
        const { data: pharmacyExists } = await mockSupabaseAdmin.from("pharmacies").select("id").eq("id", pharmacy_id).maybeSingle();
        if (!pharmacyExists) return { status: 404, error: "Pharmacy not found" };
    }

    // 5. Create user logic...
    return { status: 200, success: true };
}

describe('Integration: Create Staff User Logic', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            then: (resolve: any) => resolve({ data: null, error: null }),
        };
    });

    it('deve permitir gestor criar funcionario para sua propria farmacia', async () => {
        const req = {
            headers: { Authorization: 'Bearer token' },
            body: {
                email: 'staff@test.com',
                password: 'password',
                pharmacy_id: 'ph-1',
                metadata: { role: 'staff' }
            }
        };

        mockSupabase.single.mockResolvedValue({ data: { role: 'merchant', pharmacy_id: 'ph-1' }, error: null });
        mockSupabase.maybeSingle.mockResolvedValue({ data: { id: 'ph-1' }, error: null });

        const result = await simulateCreateStaffUser(req, mockSupabase);
        expect(result.status).toBe(200);
        expect(result.success).toBe(true);
    });

    it('deve bloquear gestor tentando criar funcionario para OUTRA farmacia', async () => {
        const req = {
            headers: { Authorization: 'Bearer token' },
            body: {
                email: 'staff@test.com',
                password: 'password',
                pharmacy_id: 'ph-2', // Diferente da dele
                metadata: { role: 'staff' }
            }
        };

        mockSupabase.single.mockResolvedValue({ data: { role: 'merchant', pharmacy_id: 'ph-1' }, error: null });

        const result = await simulateCreateStaffUser(req, mockSupabase);
        expect(result.status).toBe(403);
        expect(result.error).toContain('Unauthorized farm');
    });

    it('deve exigir pharmacy_id para roles vinculadas', async () => {
        const req = {
            headers: { Authorization: 'Bearer token' },
            body: {
                email: 'staff@test.com',
                password: 'password',
                metadata: { role: 'staff' }
                // Faltando pharmacy_id
            }
        };

        mockSupabase.single.mockResolvedValue({ data: { role: 'admin' }, error: null });

        const result = await simulateCreateStaffUser(req, mockSupabase);
        expect(result.status).toBe(400);
        expect(result.error).toContain('pharmacy_id required');
    });
});
