import { create } from 'zustand';
import {
  db,
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
} from '../services/firebase';

import { ServiceType, CreditWeight, computePrice } from '../utils/creditPricing';

export interface Subscription {
  id: string;
  userId: string;
  /** 'single' (7kg) | 'couple' (14kg) — retained for legacy, superseded by kgPerCredit. */
  planType: 'single' | 'couple';
  /** Service this credit pack is locked to (defaults to wash_fold for legacy docs). */
  serviceType: ServiceType;
  /** Per-kg rate locked at purchase (replaces reliance on dynamic RATE_TABLE). */
  ratePerKg: number;
  totalCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  currentCreditIndex: number; // For sequential unlocking
  pricePerCredit: number;
  totalAmount: number;
  kgPerCredit: number;
  status: 'active' | 'completed' | 'expired';
  purchasedAt: Timestamp;
  expiresAt: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreditUsage {
  id: string;
  subscriptionId: string;
  userId: string;
  creditIndex: number;
  orderId: string | null;
  usedAt: Timestamp;
  createdAt: Timestamp;
}

interface SubscriptionState {
  activeSubscription: Subscription | null;
  pastSubscriptions: Subscription[];
  creditUsage: CreditUsage[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSubscriptions: (userId: string) => Promise<void>;
  createSubscription: (
    userId: string,
    planType: 'single' | 'couple',
    totalCredits: number,
    serviceType?: ServiceType,
    kgPerCredit?: CreditWeight
  ) => Promise<{ success: boolean; subscriptionId?: string; error?: string }>;
  getTotalCredits: () => number;
  isCreditUnlocked: (index: number) => boolean;
  isCreditUsed: (index: number) => boolean;
  refetch: (userId: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  activeSubscription: null,
  pastSubscriptions: [],
  creditUsage: [],
  loading: false,
  error: null,

  fetchSubscriptions: async (userId: string) => {
    if (!userId) return;

    set({ loading: true, error: null });

    try {
      // Fetch active subscription
      const subscriptionsRef = collection(db, 'users', userId, 'subscriptions');

      // Get all subscriptions and filter client-side to avoid index issues
      let activeSub: Subscription | undefined;
      let activeSubId: string | undefined;

      try {
        const activeQuery = query(
          subscriptionsRef,
          where('status', '==', 'active'),
          where('isActive', '==', true)
        );
        const activeSnapshot = await getDocs(activeQuery);
        if (!activeSnapshot.empty) {
          activeSub = activeSnapshot.docs[0].data() as Subscription;
          activeSubId = activeSnapshot.docs[0].id;
        }
      } catch (error) {
        // If query fails, try getting all and filtering
        console.log('Active subscription query failed, trying alternative:', error);
        const allSnapshot = await getDocs(subscriptionsRef);
        const found = allSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .find((sub: any) => sub.status === 'active' && sub.isActive === true);
        if (found) {
          activeSub = found as Subscription;
          activeSubId = found.id;
        }
      }

      if (activeSub && activeSubId) {
        activeSub.id = activeSubId;
        set({ activeSubscription: activeSub });

        // Fetch credit usage for active subscription
        const usageRef = collection(
          db,
          'users',
          userId,
          'subscriptions',
          activeSub.id,
          'creditUsage'
        );
        const usageSnapshot = await getDocs(usageRef);
        const usage = usageSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CreditUsage[];

        set({ creditUsage: usage });
      } else {
        set({ activeSubscription: null, creditUsage: [] });
      }

      // Fetch past subscriptions (try to get all first, then filter)
      try {
        const allSubsQuery = query(
          subscriptionsRef,
          orderBy('createdAt', 'desc')
        );
        const allSubsSnapshot = await getDocs(allSubsQuery);
        const pastSubs = allSubsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((sub: any) =>
            sub.status === 'completed' || sub.status === 'expired'
          ) as Subscription[];

        set({ pastSubscriptions: pastSubs });
      } catch (error) {
        // If query fails (e.g., no index), just set empty array
        console.log('Could not fetch past subscriptions:', error);
        set({ pastSubscriptions: [] });
      }
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      set({ error: error.message || 'Failed to fetch subscriptions' });
    } finally {
      set({ loading: false });
    }
  },

  createSubscription: async (
    userId: string,
    planType: 'single' | 'couple',
    totalCredits: number,
    serviceType: ServiceType = 'wash_fold',
    kgPerCredit: CreditWeight = 7
  ) => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate credits (2-4 for MVP, can be extended)
    if (totalCredits < 2 || totalCredits > 4) {
      return { success: false, error: 'Credits must be between 2 and 4' };
    }

    // Check for existing active subscription
    const { activeSubscription } = get();
    if (activeSubscription && activeSubscription.status === 'active') {
      return { success: false, error: 'You already have an active subscription' };
    }

    // Pricing derived from the shared model (rate per kg × kg × credits).
    const { pricePerCredit, totalAmount, ratePerKg } = computePrice(serviceType, kgPerCredit, totalCredits);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    try {
      const subscriptionsRef = collection(db, 'users', userId, 'subscriptions');

      const subscriptionData: Omit<Subscription, 'id'> = {
        userId,
        planType,
        serviceType,
        ratePerKg,
        totalCredits,
        creditsUsed: 0,
        creditsRemaining: totalCredits,
        currentCreditIndex: 0, // Start with first credit
        pricePerCredit,
        totalAmount,
        kgPerCredit,
        status: 'active',
        purchasedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(subscriptionsRef, subscriptionData);

      // Refetch subscriptions
      await get().fetchSubscriptions(userId);

      return { success: true, subscriptionId: docRef.id };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message || 'Failed to create subscription' };
    }
  },

  getTotalCredits: () => {
    return get().activeSubscription?.creditsRemaining || 0;
  },

  isCreditUnlocked: (index: number) => {
    const { activeSubscription } = get();
    if (!activeSubscription) return false;
    return index === activeSubscription.currentCreditIndex;
  },

  isCreditUsed: (index: number) => {
    const { creditUsage } = get();
    return creditUsage.some(usage => usage.creditIndex === index);
  },

  refetch: async (userId: string) => {
    await get().fetchSubscriptions(userId);
  },
}));

