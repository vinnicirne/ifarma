import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages - Client
import { ClientHome } from '../pages/client/ClientHome'; // Assuming RootRedirect uses it, but root route here uses RootRedirect
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
import { PrescriptionUpload } from '../pages/client/PrescriptionUpload';
import { PharmacyChat } from '../pages/client/PharmacyChat';
import { Auth } from '../components/auth/Auth';
import PartnerRegistration from '../pages/PartnerRegistration';
import ForgotPassword from '../pages/ForgotPassword';
import DiagnosticPage from '../pages/DiagnosticPage';
import HelpSupport from '../pages/HelpSupport';
import PrivacyData from '../pages/PrivacyData';

// Pages - Admin
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import OrderTracking from '../pages/admin/OrderTracking';
import { UserManagement } from '../pages/admin/UserManagement';
import PharmacyManagement from '../pages/admin/PharmacyManagement';
import PharmacyDetails from '../pages/admin/PharmacyDetails';
import { MotoboyManagement } from '../pages/admin/MotoboyManagement';
import { AdManagement } from '../pages/admin/AdManagement';
import { PromotionManagement } from '../pages/admin/PromotionManagement';
import { SystemSettings } from '../pages/admin/SystemSettings';

// Pages - Merchant
import MerchantLogin from '../pages/merchant/MerchantLogin';
import MerchantDashboard from '../pages/merchant/MerchantDashboard';
import MerchantOrderManagement from '../pages/merchant/MerchantOrderManagement';
import InventoryControl from '../pages/merchant/InventoryControl';
import MerchantFinancial from '../pages/merchant/MerchantFinancial';
import StoreCustomization from '../pages/merchant/StoreCustomization';
import TeamManagement from '../pages/merchant/TeamManagement';

// Pages - Motoboy
import MotoboyLogin from '../pages/MotoboyLogin';
import MotoboyDashboard from '../pages/MotoboyDashboard';
import MotoboyOrders from '../pages/MotoboyOrders';
import { MotoboyDeliveryDetailWithETA } from '../pages/motoboy/MotoboyDeliveryDetailWithETA';
import MotoboyRouteStatus from '../pages/MotoboyRouteStatus';
import MotoboyDeliveryConfirm from '../pages/MotoboyDeliveryConfirm';
import MotoboyHistory from '../pages/MotoboyHistory';

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

            {/* Diagnostic Route - Public */}
            <Route path="/diagnostic" element={<DiagnosticPage />} />

            {/* Protected Client Routes */}
            <Route path="/cart" element={<ProtectedRoute session={session}><Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute session={session}><Checkout /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute session={session}><UserProfile session={session} profile={profile} /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute session={session}><Favorites /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute session={session}><Notifications /></ProtectedRoute>} />
            <Route path="/order-tracking/:orderId?" element={<ProtectedRoute session={session}><UserOrderTracking /></ProtectedRoute>} />
            <Route path="/prescription-upload" element={<ProtectedRoute session={session}><PrescriptionUpload /></ProtectedRoute>} />
            <Route path="/chat/:orderId?" element={<ProtectedRoute session={session}><PharmacyChat /></ProtectedRoute>} />

            {/* Protected Admin Routes */}
            <Route path="/dashboard" element={<AdminRoute session={session} profile={profile}><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard profile={profile} />} />
                <Route path="tracking" element={<OrderTracking />} />
                <Route path="users" element={<UserManagement profile={profile} />} />
                <Route path="pharmacies" element={<PharmacyManagement profile={profile} />} />
                <Route path="pharmacy/:id" element={<PharmacyDetails />} />
                <Route path="motoboys" element={<MotoboyManagement profile={profile} />} />
                <Route path="ads" element={<AdManagement profile={profile} />} />
                <Route path="promotions" element={<PromotionManagement profile={profile} />} />
                <Route path="settings" element={<SystemSettings profile={profile} />} />
            </Route>

            {/* Protected Gestor Routes */}
            <Route path="/gestor/login" element={<MerchantLogin />} />
            <Route path="/gestor" element={<GestorRoute session={session} profile={profile}><MerchantDashboard /></GestorRoute>} />
            <Route path="/gestor/orders" element={<GestorRoute session={session} profile={profile}><MerchantOrderManagement /></GestorRoute>} />
            <Route path="/gestor/products" element={<GestorRoute session={session} profile={profile}><InventoryControl /></GestorRoute>} />
            <Route path="/gestor/financial" element={<GestorRoute session={session} profile={profile}><MerchantFinancial /></GestorRoute>} />
            <Route path="/gestor/settings" element={<GestorRoute session={session} profile={profile}><StoreCustomization /></GestorRoute>} />
            <Route path="/gestor/equipe" element={<GestorRoute session={session} profile={profile}><TeamManagement /></GestorRoute>} />

            {/* Motoboy Routes */}
            <Route path="/motoboy-login" element={<MotoboyLogin />} />
            <Route path="/motoboy-dashboard" element={<MotoboyDashboard session={session} profile={profile} />} />
            <Route path="/motoboy-orders" element={<MotoboyOrders />} />
            <Route path="/motoboy-delivery/:id" element={<MotoboyDeliveryDetailWithETA />} />
            <Route path="/motoboy-route-status" element={<MotoboyRouteStatus />} />
            <Route path="/motoboy-delivery-confirm" element={<MotoboyDeliveryConfirm />} />
            <Route path="/motoboy-history" element={<MotoboyHistory />} />
        </Routes>
    );
};
