import { useAdminAuthStore } from './adminAuthStore';

/**
 * Centralized admin permissions hook for RBAC.
 * 
 * Roles:
 * - super_admin: Full access to everything
 * - store_admin: Limited dashboard, no revenue/stats, NO customer PII
 * - delivery_partner: Limited dashboard, HAS full customer PII
 */
export const useAdminPermissions = () => {
  const { adminRole } = useAdminAuthStore();
  const isSuperAdmin = adminRole === 'super_admin';
  const isStoreAdmin = adminRole === 'store_admin';
  const isDeliveryPartner = adminRole === 'delivery_partner';

  // Both store_admin and delivery_partner fall into the "restricted dashboard" category
  const hasRestrictedDashboard = isStoreAdmin || isDeliveryPartner || adminRole === 'restricted';

  return {
    // ── Dashboard Sections ──
    /** User Statistics (Total Users / Active Users) */
    canViewUserStats: isSuperAdmin,
    /** Revenue Analytics (date range, CSV export) */
    canViewRevenue: isSuperAdmin,
    /** Quick Actions (Manage Orders, Subscriptions, Demand Heatmap) */
    canViewQuickActions: isSuperAdmin,

    // ── Order Tabs ──
    /** Delivered orders tab (300+ rows) */
    canViewDelivered: isSuperAdmin,
    /** Cancelled orders tab (200+ rows) */
    canViewCancelled: isSuperAdmin,

    // ── Bottom Navigation Tabs ──
    /** Subscriptions tab in footer */
    canViewSubscriptions: isSuperAdmin,

    // ── Customer PII (Personally Identifiable Information) ──
    /** Can view full customer phone number (false = masked to last 4 digits) */
    canViewCustomerPhone: !isStoreAdmin,
    /** Can view customer physical address/location and Directions button */
    canViewCustomerLocation: !isStoreAdmin,
    /** Can view the WhatsApp contact button */
    canViewCustomerWhatsApp: !isStoreAdmin,

    // ── Actions (all roles can do these) ──
    /** All order actions: pickup, processing, ready, out for delivery, delivery */
    canPerformOrderActions: true,
    /** Export CSV from revenue */
    canExportCSV: isSuperAdmin,

    // ── Role Checks ──
    isSuperAdmin,
    isStoreAdmin,
    isDeliveryPartner,
    isRestrictedDashboard: hasRestrictedDashboard,
  };
};
