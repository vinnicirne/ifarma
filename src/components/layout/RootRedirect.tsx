import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAppContext } from '../../lib/appContext';
import { ClientHome } from '../../pages/client/ClientHome';

interface RootRedirectProps {
    userLocation: { lat: number; lng: number } | null;
    sortedPharmacies: any[];
    session: any;
}

export const RootRedirect = ({ userLocation, sortedPharmacies, session }: RootRedirectProps) => {
    const context = getAppContext();
    console.log('🚀 Redirecionando com contexto:', context);

    if (context === 'motoboy') {
        return <Navigate to="/motoboy-login" replace />;
    }
    if (context === 'farmacia') {
        return <Navigate to="/gestor/login" replace />;
    }
    return <ClientHome userLocation={userLocation} sortedPharmacies={sortedPharmacies} session={session} />;
};
