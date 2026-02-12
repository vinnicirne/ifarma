import { supabase } from '../lib/supabase';
import type { AdminStats, ChartDataItem, ActivityItem, TopPharmacy, TopCategory, TopProduct } from '../types/admin';

export const adminService = {
    async getGoogleMapsKey(): Promise<string | null> {
        // PRIORIDADE 1: Banco de Dados (Flexibilidade em runtime)
        const { data: settings } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'google_maps_api_key')
            .maybeSingle();

        if (settings?.value) return settings.value;

        // PRIORIDADE 2: Variável de Ambiente (Build time)
        return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
    },

    async fetchDashboardData(timeFilter: string, customDates: { start: string, end: string }) {
        const now = new Date();
        let startDate = new Date();
        let prevStartDate = new Date();

        if (timeFilter === 'hoje') {
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(now.getDate() - 1);
            prevStartDate.setHours(0, 0, 0, 0);
        } else if (timeFilter === '7d') {
            startDate.setDate(now.getDate() - 7);
            prevStartDate.setDate(now.getDate() - 14);
        } else if (timeFilter === '30d') {
            startDate.setDate(now.getDate() - 30);
            prevStartDate.setDate(now.getDate() - 60);
        } else if (timeFilter === 'personalizado' && customDates.start) {
            startDate = new Date(customDates.start);
            const diff = now.getTime() - startDate.getTime();
            prevStartDate = new Date(startDate.getTime() - diff);
        }

        const startDateISO = startDate.toISOString();
        const prevStartDateISO = prevStartDate.toISOString();

        // 1. Fetch Vendas
        const { data: currentSales } = await supabase
            .from('orders')
            .select('id, total_price, pharmacy_id, status, created_at')
            .eq('status', 'entregue')
            .gte('created_at', startDateISO);

        const { data: prevSales } = await supabase
            .from('orders')
            .select('total_price')
            .eq('status', 'entregue')
            .gte('created_at', prevStartDateISO)
            .lt('created_at', startDateISO);

        const totalSales = currentSales?.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0) || 0;
        const pastSales = prevSales?.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0) || 0;
        const salesChange = pastSales > 0 ? ((totalSales - pastSales) / pastSales) * 100 : 0;

        const totalOrders = currentSales?.length || 0;
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
        const prevTotalOrders = prevSales?.length || 0;
        const prevAvgTicket = prevTotalOrders > 0 ? pastSales / prevTotalOrders : 0;
        const avgTicketChange = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0;

        // 2. Active Orders and Pharmacies Count
        const [{ count: activeOrders }, { count: pharmaciesCount }] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pendente', 'preparando', 'em_rota']),
            supabase.from('pharmacies').select('*', { count: 'exact', head: true })
        ]);

        // 3. Ranking Farmácias
        const { data: pharmNames } = await supabase.from('pharmacies').select('id, name, latitude, longitude, phone, establishment_phone');
        const pharmaNameMap = (pharmNames || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

        const pharmaRankingMap: { [key: string]: { name: string, total: number } } = {};
        currentSales?.forEach(o => {
            const id = o.pharmacy_id || 'unknown';
            const pName = pharmaNameMap[id] || 'Farmácia';
            if (!pharmaRankingMap[id]) pharmaRankingMap[id] = { name: pName, total: 0 };
            pharmaRankingMap[id].total += (Number(o.total_price) || 0);
        });

        const topPharmacies = Object.values(pharmaRankingMap).sort((a, b) => b.total - a.total).slice(0, 5);

        // 4. Initial Activity
        const { data: initialOrders } = await supabase
            .from('orders')
            .select('id, customer_name, total_price, status, created_at')
            .order('created_at', { ascending: false })
            .limit(4);

        // 5. Category Ranking
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('quantity, price, products(name, category)')
            .in('order_id', currentSales?.map(o => o.id) || []);

        let topCategories: TopCategory[] = [];
        let topProducts: TopProduct[] = [];

        if (orderItems) {
            const catMap: { [key: string]: number } = {};
            const prodMap: { [key: string]: any } = {};

            orderItems.forEach((item: any) => {
                const cat = item.products?.category || 'Outros';
                catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);

                const pName = item.products?.name || 'Desconhecido';
                if (!prodMap[pName]) prodMap[pName] = { name: pName, quantity: 0, total: 0, category: cat };
                prodMap[pName].quantity += item.quantity;
                prodMap[pName].total += (item.price * item.quantity);
            });

            topCategories = Object.entries(catMap)
                .map(([name, total]) => ({ name, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);

            topProducts = Object.values(prodMap)
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 5);
        }

        // 6. Projeção e SLA (Statics for now based on logic)
        const daysDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const dailyAvg = totalSales / daysDiff;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthlyProjection = dailyAvg * daysInMonth;

        return {
            stats: {
                sales: totalSales,
                prevSales: pastSales,
                salesChange,
                avgTicket,
                prevAvgTicket,
                avgTicketChange,
                activeOrders: activeOrders || 0,
                pharmaciesCount: pharmaciesCount || 0
            },
            topPharmacies,
            recentOrders: initialOrders || [],
            topCategories,
            topProducts,
            monthlyProjection,
            pharmNames: pharmNames || [],
            currentSales: currentSales || []
        };
    }
};
