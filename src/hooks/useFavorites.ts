import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useFavorites = (userId: string | null) => {
    const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
    const [favoritePharmacies, setFavoritePharmacies] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchFavorites();
        }
    }, [userId]);

    const fetchFavorites = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [prodData, pharmaData] = await Promise.all([
                supabase.from('favorite_products').select('product_id').eq('user_id', userId),
                supabase.from('favorite_pharmacies').select('pharmacy_id').eq('user_id', userId)
            ]);

            if (prodData.data) setFavoriteProducts(prodData.data.map(f => f.product_id));
            if (pharmaData.data) setFavoritePharmacies(pharmaData.data.map(f => f.pharmacy_id));
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleProductFavorite = async (productId: string) => {
        if (!userId) return;
        const isFav = favoriteProducts.includes(productId);

        if (isFav) {
            await supabase.from('favorite_products').delete().eq('user_id', userId).eq('product_id', productId);
            setFavoriteProducts(prev => prev.filter(id => id !== productId));
        } else {
            await supabase.from('favorite_products').insert({ user_id: userId, product_id: productId });
            setFavoriteProducts(prev => [...prev, productId]);
        }
    };

    const togglePharmacyFavorite = async (pharmacyId: string) => {
        if (!userId) return;
        const isFav = favoritePharmacies.includes(pharmacyId);

        if (isFav) {
            await supabase.from('favorite_pharmacies').delete().eq('user_id', userId).eq('pharmacy_id', pharmacyId);
            setFavoritePharmacies(prev => prev.filter(id => id !== pharmacyId));
        } else {
            await supabase.from('favorite_pharmacies').insert({ user_id: userId, pharmacy_id: pharmacyId });
            setFavoritePharmacies(prev => [...prev, pharmacyId]);
        }
    };

    return {
        favoriteProducts,
        favoritePharmacies,
        toggleProductFavorite,
        togglePharmacyFavorite,
        loading,
        refreshFavorites: fetchFavorites
    };
};
