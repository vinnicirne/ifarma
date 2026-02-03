import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Loading Component
const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Carregando...</p>
        </div>
    </div>
);

// Pages - Client (eager load - small and frequently accessed)
import { ClientHome } from '../pages/client/ClientHome';
import { RootRedirect } from '../components/layout/RootRedirect';
import { PharmacyList } from '../pages/client/PharmacyList';
import { PharmacyPage } from '../pages/client/PharmacyPage';
import { ProductPage } from '../pages/client/ProductPage';
import { Cart } from '../pages/client/Cart';
import Checkout from '../pages/client/Checkout';
import UserProfile from '../pages/UserProfile';
import Favorites from '../pages/Favorites';
import Notifications from '../pages/Notifications';
import { UserOrderTracking } from '../pages/client/UserOrderTracking';
import UserOrders from '../pages/client/UserOrders';
import { PrescriptionUpload } from '../pages/client/PrescriptionUpload';
import { PharmacyChat } from '../pages/client/PharmacyChat';
import { Auth } from '../components/auth/Auth';
import PartnerRegistration from '../pages/PartnerRegistration';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import DiagnosticPage from '../pages/DiagnosticPage';
import HelpSupport from '../pages/HelpSupport';
import PrivacyData from '../pages/PrivacyData';

// Pages - Admin (lazy load - large and admin-only)
import AdminLayout from '../layouts/AdminLayout';
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const OrderTracking = lazy(() => import('../pages/admin/OrderTracking'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const PharmacyManagement = lazy(() => import('../pages/admin/PharmacyManagement'));
const PharmacyDetails = lazy(() => import('../pages/admin/PharmacyDetails'));
const MotoboyManagement = lazy(() => import('../pages/admin/MotoboyManagement').then(m => ({ default: m.MotoboyManagement })));
const AdManagement = lazy(() => import('../pages/admin/AdManagement').then(m => ({ default: m.AdManagement })));
const PromotionManagement = lazy(() => import('../pages/admin/PromotionManagement').then(m => ({ default: m.PromotionManagement })));
const SystemSettings = lazy(() => import('../pages/admin/SystemSettings').then(m => ({ default: m.SystemSettings })));

// Pages - Merchant (lazy load - large files)
import MerchantLogin from '../pages/merchant/MerchantLogin';
const MerchantDashboard = lazy(() => import('../pages/merchant/MerchantDashboard'));
const MerchantOrderManagement = lazy(() => import('../pages/merchant/MerchantOrderManagement'));
const InventoryControl = lazy(() => import('../pages/merchant/InventoryControl'));
const MerchantFinancial = lazy(() => import('../pages/merchant/MerchantFinancial'));
const StoreCustomization = lazy(() => import('../pages/merchant/StoreCustomization'));
const TeamManagement = lazy(() => import('../pages/merchant/TeamManagement'));

// Pages - Motoboy (lazy load - large dashboard)
import MotoboyLogin from '../pages/MotoboyLogin';
const MotoboyDashboard = lazy(() => import('../pages/MotoboyDashboard'));
const MotoboyOrders = lazy(() => import('../pages/MotoboyOrders'));
const MotoboyDeliveryDetailWithETA = lazy(() => import('../pages/motoboy/MotoboyDeliveryDetailWithETA').then(m => ({ default: m.MotoboyDeliveryDetailWithETA })));
const MotoboyDeliveryConfirm = lazy(() => import('../pages/MotoboyDeliveryConfirm'));
const MotoboyEarnings = lazy(() => import('../pages/MotoboyEarnings'));
const MotoboyRouteStatus = lazy(() => import('../pages/MotoboyRouteStatus'));
const MotoboyHistory = lazy(() => import('../pages/MotoboyHistory'));
const MotoboyChat = lazy(() => import('../pages/MotoboyChat'));

// Route Guards
import { ProtectedRoute, AdminRoute, GestorRoute } from './RouteGuards';

interface AppRoutesProps {
    session: any;
    profile: any;
    userLocation: { lat: number; lng: number } | null;
    sortedPharmacies: any[];
}

export const AppRoutes = ({ session, profile, userLocation, sortedPharmacies }: AppRoutesProps) => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRedirect userLocation={userLocation} sortedPharmacies={sortedPharmacies} session={session} />} />
            <Route path="/pharmacies" element={<PharmacyList pharmacies={sortedPharmacies} session={session} />} />
            <Route path="/pharmacy/:id" element={<PharmacyPage session={session} />} />
            <Route path="/product/:id" element={<ProductPage session={session} />} />
            <Route path="/privacy" element={<PrivacyData />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/login" element={<Auth view="login" />} />
            <Route path="/signup" element={<Auth view="signup" />} />
            <Route path="/partner/register" element={<PartnerRegistration />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Diagnostic Route - Public */}
            <Route path="/diagnostic" element={<DiagnosticPage />} />

            {/* Protected Client Routes */}
            <Route path="/cart" element={<ProtectedRoute session={session}><Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute session={session}><Checkout /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute session={session}><UserProfile session={session} profile={profile} /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute session={session}><Favorites /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute session={session}><Notifications /></ProtectedRoute>} />
            <Route path="/meus-pedidos" element={<ProtectedRoute session={session}><UserOrders /></ProtectedRoute>} />
            <Route path="/order-tracking/:orderId?" element={<ProtectedRoute session={session}><UserOrderTracking /></ProtectedRoute>} />
            <Route path="/pedido/:orderId?" element={<ProtectedRoute session={session}><UserOrderTracking /></ProtectedRoute>} />
            <Route path="/prescription-upload" element={<ProtectedRoute session={session}><PrescriptionUpload /></ProtectedRoute>} />
            <Route path="/chat/:orderId?" element={<ProtectedRoute session={session}><PharmacyChat /></ProtectedRoute>} />

            {/* Protected Admin Routes (with Suspense) */}
            <Route path="/dashboard" element={<AdminRoute session={session} profile={profile}><AdminLayout /></AdminRoute>}>
                <Route index element={<Suspense fallback={<LoadingScreen />}><AdminDashboard profile={profile} /></Suspense>} />
                <Route path="tracking" element={<Suspense fallback={<LoadingScreen />}><OrderTracking /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<LoadingScreen />}><UserManagement profile={profile} /></Suspense>} />
                <Route path="pharmacies" element={<Suspense fallback={<LoadingScreen />}><PharmacyManagement profile={profile} /></Suspense>} />
                <Route path="pharmacy/:id" element={<Suspense fallback={<LoadingScreen />}><PharmacyDetails /></Suspense>} />
                <Route path="motoboys" element={<Suspense fallback={<LoadingScreen />}><MotoboyManagement profile={profile} /></Suspense>} />
                <Route path="ads" element={<Suspense fallback={<LoadingScreen />}><AdManagement profile={profile} /></Suspense>} />
                <Route path="promotions" element={<Suspense fallback={<LoadingScreen />}><PromotionManagement profile={profile} /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<LoadingScreen />}><SystemSettings profile={profile} /></Suspense>} />
            </Route>

            {/* Protected Gestor Routes (with Suspense) */}
            <Route path="/gestor/login" element={<MerchantLogin />} />
            <Route path="/gestor" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantDashboard /></Suspense></GestorRoute>} />
            <Route path="/gestor/orders" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantOrderManagement /></Suspense></GestorRoute>} />
            <Route path="/gestor/products" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><InventoryControl /></Suspense></GestorRoute>} />
            <Route path="/gestor/financial" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantFinancial /></Suspense></GestorRoute>} />
            <Route path="/gestor/settings" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><StoreCustomization /></Suspense></GestorRoute>} />
            <Route path="/gestor/equipe" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><TeamManagement /></Suspense></GestorRoute>} />

            {/* Motoboy Routes (with Suspense) */}
            <Route path="/motoboy-login" element={<MotoboyLogin />} />
            <Route path="/motoboy-dashboard" element={<Suspense fallback={<LoadingScreen />}><MotoboyDashboard session={session} profile={profile} /></Suspense>} />
            <Route path="/motoboy-orders" element={<Suspense fallback={<LoadingScreen />}><MotoboyOrders /></Suspense>} />
            <Route path="/motoboy-delivery/:id" element={<Suspense fallback={<LoadingScreen />}><MotoboyDeliveryDetailWithETA /></Suspense>} />
            <Route path="/motoboy-route-status" element={<Suspense fallback={<LoadingScreen />}><MotoboyRouteStatus /></Suspense>} />
            <Route path="/motoboy-history" element={<Suspense fallback={<LoadingScreen />}><MotoboyHistory /></Suspense>} />
            <Route path="/motoboy-earnings" element={<Suspense fallback={<LoadingScreen />}><MotoboyEarnings /></Suspense>} />

            <Route path="/motoboy-confirm/:orderId" element={<Suspense fallback={<LoadingScreen />}><MotoboyDeliveryConfirm /></Suspense>} />
            <Route path="/motoboy-chat/:orderId" element={<Suspense fallback={<LoadingScreen />}><MotoboyChat /></Suspense>} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
