export const isPharmacyOpen = (pharmacy: any): boolean => {
    if (pharmacy.is_open) return true;
    if (!pharmacy.auto_open_status) return false;
    if (Array.isArray(pharmacy.opening_hours) && pharmacy.opening_hours.length > 0) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const todayRule = pharmacy.opening_hours.find((h: any) => h.day === currentDay);
        if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
            const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
            const [hClose, mClose] = todayRule.close.split(':').map(Number);
            const openTime = hOpen * 60 + mOpen;
            const closeTime = hClose * 60 + mClose;
            return currentTime >= openTime && currentTime < closeTime;
        }
    }
    return false;
};
