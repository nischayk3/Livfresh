import { create } from 'zustand';
import {
  getOrderStats,
  getAllOrders,
  getRevenue,
  updateOrderStatusAdmin,
  getSubscriptionStats,
  addCreditsAdmin,
  bulkAddCreditsAdmin,
  getUserStats,
} from '../services/adminFirestore';
import { Timestamp } from 'firebase/firestore';

export interface OrderStats {
  total: number;
  confirmed: number;
  pickup_completed: number;
  processing: number;
  ready: number;
  out_for_delivery: number;
  delivered: number;
}

export interface AdminOrder {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  pickupTime?: string;
  pickupDate?: string;
  deliveryTime?: string;
  deliveryDate?: string;
  pickupOTP?: string;
  deliveryOTP?: string;
  pickupVerified?: boolean;
  deliveryVerified?: boolean;
  tokenNumber?: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  address?: {
    label: string;
    addressLine: string;
    city: string;
    pincode: string;
  };
  items?: any[];
}

export interface SubscriptionStats {
  totalSubscribers: number;
  activeSubscribers: number;
  subscribers: any[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  currentUser: any | null;
}

export interface RevenueData {
  revenue: number;
  orderRevenue: number;
  subscriptionRevenue: number;
  orderCount: number;
  subscriptionCount: number;
  orders: any[];
}

interface AdminStoreState {
  // Stats
  orderStats: OrderStats;
  subscriptionStats: SubscriptionStats;
  userStats: UserStats;

  // Data
  orders: AdminOrder[];
  revenue: RevenueData | null;

  // Loading states
  statsLoading: boolean;
  ordersLoading: boolean;
  subscriptionsLoading: boolean;
  revenueLoading: boolean;
  userStatsLoading: boolean;

  // Error states
  error: string | null;

  // Actions
  fetchOrderStats: (silent?: boolean) => Promise<void>;
  fetchAllOrders: (silent?: boolean) => Promise<void>;
  fetchRevenue: (startDate: Date, endDate: Date) => Promise<void>;
  fetchSubscriptionStats: (silent?: boolean) => Promise<void>;
  fetchUserStats: (silent?: boolean) => Promise<void>;
  updateOrderStatus: (
    userId: string,
    orderId: string,
    newStatus: string,
    options?: {
      verifyPickup?: boolean;
      verifyDelivery?: boolean;
      tokenNumber?: string;
      pickupOTP?: string;
      deliveryOTP?: string;
      additionalData?: any;
    }
  ) => Promise<boolean>;
  addCredits: (
    name: string,
    phone: string,
    planType: 'single' | 'couple',
    credits: number
  ) => Promise<{ success: boolean; error?: string }>;
  bulkAddCredits: (
    rows: { name: string; phone: string; planType: string; credits: number }[]
  ) => Promise<{ success: boolean; processed?: number; failed?: number; errors?: string[] }>;

  // Clear error
  clearError: () => void;
}

const defaultStats: OrderStats = {
  total: 0,
  confirmed: 0,
  pickup_completed: 0,
  processing: 0,
  ready: 0,
  out_for_delivery: 0,
  delivered: 0,
};

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  // Initial state
  orderStats: defaultStats,
  subscriptionStats: {
    totalSubscribers: 0,
    activeSubscribers: 0,
    subscribers: [],
  },
  userStats: {
    totalUsers: 0,
    activeUsers: 0,
    currentUser: null,
  },
  orders: [],
  revenue: null,
  statsLoading: false,
  ordersLoading: false,
  subscriptionsLoading: false,
  revenueLoading: false,
  userStatsLoading: false,
  error: null,

  fetchOrderStats: async (silent = false) => {
    if (!silent) set({ statsLoading: true, error: null });

    try {
      const stats = await getOrderStats();
      set({ orderStats: stats });
    } catch (error: any) {
      console.error('Error fetching order stats:', error);
      set({ error: error.message || 'Failed to fetch order stats' });
    } finally {
      if (!silent) set({ statsLoading: false });
    }
  },

  fetchAllOrders: async (silent = false) => {
    if (!silent) set({ ordersLoading: true, error: null });

    try {
      const orders = await getAllOrders();
      set({ orders });
    } catch (error: any) {
      console.error('Error fetching all orders:', error);
      set({ error: error.message || 'Failed to fetch orders' });
    } finally {
      if (!silent) set({ ordersLoading: false });
    }
  },

  fetchRevenue: async (startDate: Date, endDate: Date) => {
    set({ revenueLoading: true, error: null });

    try {
      const revenueData = await getRevenue(startDate, endDate);
      set({ revenue: revenueData });
    } catch (error: any) {
      console.error('Error fetching revenue:', error);
      set({ error: error.message || 'Failed to fetch revenue' });
    } finally {
      set({ revenueLoading: false });
    }
  },

  fetchSubscriptionStats: async (silent = false) => {
    if (!silent) set({ subscriptionsLoading: true, error: null });

    try {
      const stats = await getSubscriptionStats();
      set({ subscriptionStats: stats });
    } catch (error: any) {
      console.error('Error fetching subscription stats:', error);
      set({ error: error.message || 'Failed to fetch subscription stats' });
    } finally {
      if (!silent) set({ subscriptionsLoading: false });
    }
  },

  updateOrderStatus: async (
    userId: string,
    orderId: string,
    newStatus: string,
    options?
  ) => {
    try {
      // Optimistic update
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId && order.userId === userId
            ? { ...order, status: newStatus }
            : order
        ),
      }));

      await updateOrderStatusAdmin(userId, orderId, newStatus, options);

      // Refresh stats and orders
      get().fetchOrderStats(true);
      get().fetchAllOrders(true);

      return true;
    } catch (error: any) {
      console.error('Error updating order status:', error);
      set({ error: error.message || 'Failed to update order status' });

      // Revert optimistic update
      get().fetchAllOrders(true);

      return false;
    }
  },

  addCredits: async (name, phone, planType, credits) => {
    try {
      const result = await addCreditsAdmin(name, phone, planType, credits);
      if (result.success) {
        // Refresh subscription stats
        get().fetchSubscriptionStats(true);
      }
      return result;
    } catch (error: any) {
      console.error('Error adding credits:', error);
      return { success: false, error: error.message || 'Failed to add credits' };
    }
  },

  bulkAddCredits: async (rows) => {
    try {
      const result = await bulkAddCreditsAdmin(rows);
      if (result.success) {
        // Refresh subscription stats
        get().fetchSubscriptionStats(true);
      }
      return result;
    } catch (error: any) {
      console.error('Error bulk adding credits:', error);
      return {
        success: false,
        processed: 0,
        failed: rows.length,
        errors: [error.message || 'Bulk operation failed'],
      };
    }
  },

  fetchUserStats: async (silent = false) => {
    if (!silent) set({ userStatsLoading: true, error: null });

    try {
      const stats = await getUserStats();
      set({ userStats: stats });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      set({ error: error.message || 'Failed to fetch user stats' });
    } finally {
      if (!silent) set({ userStatsLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

