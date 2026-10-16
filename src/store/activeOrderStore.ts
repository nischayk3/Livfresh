import { create } from 'zustand';
import { collection, query, orderBy, limit, onSnapshot, db } from '../services/firebase';

export interface ActiveOrder {
  id: string;
  status: string;
  createdAt: any;
  items?: any[];
  billDetails?: {
    total: number;
    subtotal?: number;
    discount?: number;
  };
  pickupDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    type?: string;
  };
  deliveryDate?: string;
  deliveryTime?: string;
  [key: string]: any;
}

export const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refund_processed'];

interface ActiveOrderState {
  activeOrder: ActiveOrder | null;
  activeOrdersCount: number;
  isLoading: boolean;
  subscribeToActiveOrders: (userId: string) => () => void;
  reset: () => void;
}

export const useActiveOrderStore = create<ActiveOrderState>((set) => ({
  activeOrder: null,
  activeOrdersCount: 0,
  isLoading: false,

  subscribeToActiveOrders: (userId: string) => {
    if (!userId) {
      set({ activeOrder: null, activeOrdersCount: 0, isLoading: false });
      return () => {};
    }

    set({ isLoading: true });
    const ordersRef = collection(db, 'users', userId, 'orders');
    // Fetch recent 10 orders to capture any active/in-progress orders
    const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allRecentOrders: ActiveOrder[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActiveOrder[];

        // Filter out terminal (delivered, cancelled, refunded) orders
        const activeOrders = allRecentOrders.filter(
          (order) => order.status && !TERMINAL_STATUSES.includes(order.status)
        );

        if (activeOrders.length > 0) {
          // Sort or take the latest active order
          set({
            activeOrder: activeOrders[0],
            activeOrdersCount: activeOrders.length,
            isLoading: false,
          });
        } else {
          set({
            activeOrder: null,
            activeOrdersCount: 0,
            isLoading: false,
          });
        }
      },
      (error) => {
        console.error('Error subscribing to active orders:', error);
        set({ activeOrder: null, activeOrdersCount: 0, isLoading: false });
      }
    );

    return unsubscribe;
  },

  reset: () => set({ activeOrder: null, activeOrdersCount: 0, isLoading: false }),
}));
