import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAppContext } from '../../lib/appContext';
import { ClientHome } from '../../pages/client/ClientHome';
import { LandingPage } from '../../pages/client/LandingPage';

interface RootRedirectProps {
    userLocation: { lat: number; lng: number } | null;
    sortedPharmacies: any[];
    session: any;
}

export const RootRedirect = ({ userLocation, sortedPharmacies, session }: RootRedirectProps) => {
    const context = getAppContext();
    console.log('🚀 Redirecionando com contexto:', context);

    if (context === 'motoboy') {
        if (session) return <Navigate to="/motoboy-dashboard" replace />;
        return <Navigate to="/motoboy-login" replace />;
    }
    if (context === 'farmacia') {
        if (session) return <Navigate to="/gestor" replace />;
        return <Navigate to="/gestor/login" replace />;
    }

    // Default: Cliente
    if (!session) return <LandingPage />;

    return <ClientHome userLocation={userLocation} sortedPharmacies={sortedPharmacies} session={session} />;
};
