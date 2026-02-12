export interface AdminStats {
    sales: number;
    prevSales: number;
    salesChange: number;
    avgTicket: number;
    prevAvgTicket: number;
    avgTicketChange: number;
    activeOrders: number;
    pharmaciesCount: number;
}

export interface ChartDataItem {
    name: string;
    sales: number;
}

export interface ActivityItem {
    id: string;
    user: string;
    action: string;
    time: string;
    icon?: any;
    color?: string;
}

export interface TopPharmacy {
    name: string;
    total: number;
}

export interface TopCategory {
    name: string;
    total: number;
}

export interface TopProduct {
    name: string;
    quantity: number;
    total: number;
    category: string;
}
