import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Loading Component
const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#0d161b]">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-primary/60 text-[10px] font-black uppercase tracking-widest">Carregando...</p>
        </div>
    </div>
);

// Pages - Client (eager load - critical)
import { ClientHome } from '../pages/client/ClientHome';
import { RootRedirect } from '../components/layout/RootRedirect';
import { PharmacyList } from '../pages/client/PharmacyList';
import { Auth } from '../components/auth/Auth';

// Pages - Client (lazy load - non-critical)
const PharmacyPage = lazy(() => import('../pages/client/PharmacyPage').then(m => ({ default: m.PharmacyPage })));
const PharmacyCategoryPage = lazy(() => import('../pages/client/PharmacyCategoryPage').then(m => ({ default: m.PharmacyCategoryPage })));
const GlobalCategoryPage = lazy(() => import('../pages/client/GlobalCategoryPage').then(m => ({ default: m.GlobalCategoryPage })));
const ProductPage = lazy(() => import('../pages/client/ProductPage').then(m => ({ default: m.ProductPage })));
const Cart = lazy(() => import('../pages/client/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('../pages/client/Checkout'));
const UserProfile = lazy(() => import('../pages/UserProfile'));
const Favorites = lazy(() => import('../pages/Favorites'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Settings = lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })));
const UserOrderTracking = lazy(() => import('../pages/client/UserOrderTracking').then(m => ({ default: m.UserOrderTracking })));
const UserOrders = lazy(() => import('../pages/client/UserOrders'));
const PrescriptionUpload = lazy(() => import('../pages/client/PrescriptionUpload').then(m => ({ default: m.PrescriptionUpload })));
const PharmacyChat = lazy(() => import('../pages/client/PharmacyChat').then(m => ({ default: m.PharmacyChat })));
const PartnerRegistration = lazy(() => import('../pages/PartnerRegistration'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const DiagnosticPage = null; // Removed for hygiene
const HelpSupport = lazy(() => import('../pages/HelpSupport'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const RefundPolicy = lazy(() => import('../pages/RefundPolicy'));
const AboutUs = lazy(() => import('../pages/AboutUs'));
const LandingPage = lazy(() => import('../pages/client/LandingPage').then(m => ({ default: m.LandingPage })));

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
const CategoryManagement = lazy(() => import('../pages/admin/CategoryManagement').then(m => ({ default: m.CategoryManagement })));
const CollectionManagement = lazy(() => import('../pages/admin/CollectionManagement').then(m => ({ default: m.CollectionManagement })));
const FeedManagement = lazy(() => import('../pages/admin/FeedManagement').then(m => ({ default: m.FeedManagement })));
const AdminNotifications = lazy(() => import('../pages/admin/AdminNotifications'));
const SystemSettings = lazy(() => import('../pages/admin/SystemSettings').then(m => ({ default: m.SystemSettings })));
const MonetizationManagement = lazy(() => import('../pages/admin/MonetizationManagement').then(m => ({ default: m.MonetizationManagement })));
const FeaturePlaceholder = lazy(() => import('../pages/admin/FeaturePlaceholder').then(m => ({ default: m.FeaturePlaceholder })));
const BillingPlans = lazy(() => import('../pages/admin/BillingPlans'));
const BillingPolicies = lazy(() => import('../pages/admin/BillingPolicies'));
const BillingInvoices = lazy(() => import('../pages/admin/BillingInvoices'));

// Pages - Merchant (lazy load - large files)
import MerchantLogin from '../pages/merchant/MerchantLogin';
const MerchantDashboard = lazy(() => import('../pages/merchant/MerchantDashboard'));
const MerchantOrderManagement = lazy(() => import('../pages/merchant/MerchantOrderManagement'));
const InventoryControl = lazy(() => import('../pages/merchant/InventoryControl'));
const MerchantFinancial = lazy(() => import('../pages/merchant/MerchantFinancial'));
const ProductRegistration = lazy(() => import('../pages/merchant/ProductRegistration'));

const StoreCustomization = lazy(() => import('../pages/merchant/StoreCustomization'));
const TeamManagement = lazy(() => import('../pages/merchant/TeamManagement'));
const MerchantNotifications = lazy(() => import('../pages/merchant/MerchantNotifications'));
const MerchantPromotions = lazy(() => import('../pages/merchant/MerchantPromotions').then(m => ({ default: m.MerchantPromotions })));
const MerchantBilling = lazy(() => import('../pages/merchant/MerchantBilling'));

// Layout
const MerchantLayout = lazy(() => import('../pages/merchant/MerchantLayout'));

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
const MotoboyNotifications = lazy(() => import('../pages/MotoboyNotifications'));

// Route Guards
import { ProtectedRoute, AdminRoute, GestorRoute, MotoboyRoute } from './RouteGuards';

interface AppRoutesProps {
    session: any;
    profile: any;
    userLocation: { lat: number; lng: number } | null;
    sortedPharmacies: any[];
    refreshProfile: () => void;
}

export const AppRoutes = ({ session, profile, userLocation, sortedPharmacies, refreshProfile }: AppRoutesProps) => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRedirect userLocation={userLocation} sortedPharmacies={sortedPharmacies} session={session} />} />
            <Route path="/pharmacies" element={<PharmacyList pharmacies={sortedPharmacies} session={session} />} />
            <Route path="/pharmacy/:id" element={<Suspense fallback={<LoadingScreen />}><PharmacyPage session={session} /></Suspense>} />
            <Route path="/pharmacy/:id/category/:categoryName" element={<Suspense fallback={<LoadingScreen />}><PharmacyCategoryPage session={session} /></Suspense>} />
            <Route path="/category/:id" element={<Suspense fallback={<LoadingScreen />}><GlobalCategoryPage session={session} userLocation={userLocation} /></Suspense>} />
            <Route path="/product/:id" element={<Suspense fallback={<LoadingScreen />}><ProductPage session={session} /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<LoadingScreen />}><PrivacyPolicy /></Suspense>} />
            <Route path="/refund" element={<Suspense fallback={<LoadingScreen />}><RefundPolicy /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<LoadingScreen />}><AboutUs /></Suspense>} />
            <Route path="/help" element={<Suspense fallback={<LoadingScreen />}><HelpSupport /></Suspense>} />
            <Route path="/login" element={<Auth view="login" />} />
            <Route path="/signup" element={<Auth view="signup" />} />
            <Route path="/partner/register" element={<Suspense fallback={<LoadingScreen />}><PartnerRegistration /></Suspense>} />
            <Route path="/forgot-password" element={<Suspense fallback={<LoadingScreen />}><ForgotPassword /></Suspense>} />
            <Route path="/reset-password" element={<Suspense fallback={<LoadingScreen />}><ResetPassword /></Suspense>} />

            {/* Diagnostic Route - Removed */}
            <Route path="/welcome" element={<Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>} />

            {/* Protected Client Routes */}
            <Route path="/cart" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><Cart session={session} /></Suspense></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><Checkout /></Suspense></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><UserProfile session={session} profile={profile} onRefresh={refreshProfile} /></Suspense></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><Favorites session={session} /></Suspense></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><Notifications /></Suspense></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><Settings session={session} /></Suspense></ProtectedRoute>} />
            <Route path="/meus-pedidos" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><UserOrders session={session} /></Suspense></ProtectedRoute>} />
            <Route path="/order-tracking/:orderId?" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><UserOrderTracking /></Suspense></ProtectedRoute>} />
            <Route path="/pedido/:orderId?" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><UserOrderTracking /></Suspense></ProtectedRoute>} />
            <Route path="/prescription-upload" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><PrescriptionUpload /></Suspense></ProtectedRoute>} />
            <Route path="/chat/:orderId?" element={<ProtectedRoute session={session}><Suspense fallback={<LoadingScreen />}><PharmacyChat /></Suspense></ProtectedRoute>} />

            {/* Protected Admin Routes (with Suspense) */}
            <Route path="/dashboard" element={<AdminRoute session={session} profile={profile}><AdminLayout profile={profile} /></AdminRoute>}>
                <Route index element={<Suspense fallback={<LoadingScreen />}><AdminDashboard profile={profile} /></Suspense>} />
                <Route path="tracking" element={<Suspense fallback={<LoadingScreen />}><OrderTracking /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<LoadingScreen />}><UserManagement profile={profile} /></Suspense>} />
                <Route path="pharmacies" element={<Suspense fallback={<LoadingScreen />}><PharmacyManagement profile={profile} /></Suspense>} />
                <Route path="pharmacy/:id" element={<Suspense fallback={<LoadingScreen />}><PharmacyDetails /></Suspense>} />
                <Route path="motoboys" element={<Suspense fallback={<LoadingScreen />}><MotoboyManagement profile={profile} /></Suspense>} />
                <Route path="ads" element={<Suspense fallback={<LoadingScreen />}><AdManagement profile={profile} /></Suspense>} />
                <Route path="promotions" element={<Suspense fallback={<LoadingScreen />}><PromotionManagement profile={profile} /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<LoadingScreen />}><CategoryManagement profile={profile} /></Suspense>} />
                <Route path="collections" element={<Suspense fallback={<LoadingScreen />}><CollectionManagement profile={profile} /></Suspense>} />
                <Route path="feed" element={<Suspense fallback={<LoadingScreen />}><FeedManagement profile={profile} /></Suspense>} />
                <Route path="products" element={<Suspense fallback={<LoadingScreen />}><FeaturePlaceholder title="Gestão de Produtos" /></Suspense>} />
                <Route path="reports" element={<Suspense fallback={<LoadingScreen />}><FeaturePlaceholder title="Relatórios e Analytics" /></Suspense>} />
                <Route path="notifications" element={<Suspense fallback={<LoadingScreen />}><AdminNotifications /></Suspense>} />
                <Route path="monetization" element={<Suspense fallback={<LoadingScreen />}><MonetizationManagement profile={profile} /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<LoadingScreen />}><SystemSettings profile={profile} /></Suspense>} />
                <Route path="logs" element={<Suspense fallback={<LoadingScreen />}><FeaturePlaceholder title="Logs do Sistema" /></Suspense>} />
                <Route path="billing-plans" element={<Suspense fallback={<LoadingScreen />}><BillingPlans /></Suspense>} />
                <Route path="billing-policies" element={<Suspense fallback={<LoadingScreen />}><BillingPolicies /></Suspense>} />
                <Route path="billing-invoices" element={<Suspense fallback={<LoadingScreen />}><BillingInvoices /></Suspense>} />
            </Route>

            {/* Protected Gestor Routes (with Suspense) */}
            <Route path="/gestor/login" element={<MerchantLogin />} />
            <Route path="/gestor" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantDashboard /></Suspense></GestorRoute>} />
            <Route path="/gestor/orders" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantOrderManagement /></Suspense></GestorRoute>} />
            <Route path="/gestor/products" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><InventoryControl /></Suspense></GestorRoute>} />
            <Route path="/gestor/products/new" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><ProductRegistration /></Suspense></GestorRoute>} />
            <Route path="/gestor/products/edit/:id" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><ProductRegistration /></Suspense></GestorRoute>} />
            <Route path="/gestor/financial" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantFinancial /></Suspense></GestorRoute>} />
            <Route path="/gestor/settings" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><StoreCustomization /></Suspense></GestorRoute>} />
            <Route path="/gestor/equipe" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><TeamManagement /></Suspense></GestorRoute>} />
            <Route path="/gestor/notifications" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantNotifications /></Suspense></GestorRoute>} />
            <Route path="/gestor/promotions" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantPromotions /></Suspense></GestorRoute>} />
            <Route path="/gestor/billing" element={<GestorRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MerchantBilling /></Suspense></GestorRoute>} />

            {/* Motoboy Routes (with Suspense) */}
            <Route path="/motoboy-login" element={<MotoboyLogin />} />
            <Route path="/motoboy-dashboard" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyDashboard session={session} profile={profile} /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-orders" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyOrders /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-delivery/:id" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyDeliveryDetailWithETA /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-route-status/:orderId" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyRouteStatus /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-history" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyHistory /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-earnings" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyEarnings /></Suspense></MotoboyRoute>} />

            <Route path="/motoboy-confirm/:orderId" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyDeliveryConfirm /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-chat/:orderId" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyChat /></Suspense></MotoboyRoute>} />
            <Route path="/motoboy-notifications" element={<MotoboyRoute session={session} profile={profile}><Suspense fallback={<LoadingScreen />}><MotoboyNotifications /></Suspense></MotoboyRoute>} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
