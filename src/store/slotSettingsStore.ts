import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot } from '../services/firebase';
import { db, adminDb, adminAuth } from '../services/firebase';
import { SLOT_CONSTANTS } from '../utils/slotUtils';

/**
 * slotSettingsStore.ts
 * Manages dynamic slot capacity (orders per hour slot).
 *
 * Persisted in Firestore at `config/slotSettings`.
 * Listened to in real-time by both Customer and Admin apps.
 * Falls back safely to SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT (3).
 */

export interface SlotSettings {
  maxOrdersPerSlot: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SLOT_SETTINGS: SlotSettings = {
  maxOrdersPerSlot: SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT, // 3
};

export const MIN_ORDERS_PER_SLOT = 1;
export const MAX_ORDERS_PER_SLOT_LIMIT = 10;

interface SlotSettingsState {
  maxOrdersPerSlot: number;
  isLoading: boolean;
  unsubscribe: (() => void) | null;
  initialize: () => () => void;
  fetchSettings: () => Promise<number>;
  updateMaxOrdersPerSlot: (newLimit: number) => Promise<void>;
}

export const useSlotSettingsStore = create<SlotSettingsState>((set, get) => ({
  maxOrdersPerSlot: DEFAULT_SLOT_SETTINGS.maxOrdersPerSlot,
  isLoading: true,
  unsubscribe: null,

  initialize: () => {
    // Clean up any existing subscription
    const currentUnsub = get().unsubscribe;
    if (currentUnsub) {
      currentUnsub();
    }

    try {
      const activeDb = adminAuth.currentUser ? adminDb : db;
      const configRef = doc(activeDb, 'config', 'slotSettings');

      const unsub = onSnapshot(
        configRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const val = data?.maxOrdersPerSlot;
            if (typeof val === 'number' && val >= MIN_ORDERS_PER_SLOT && val <= MAX_ORDERS_PER_SLOT_LIMIT) {
              set({ maxOrdersPerSlot: val, isLoading: false });
              return;
            }
          }
          set({ maxOrdersPerSlot: DEFAULT_SLOT_SETTINGS.maxOrdersPerSlot, isLoading: false });
        },
        (error) => {
          console.warn('[SlotSettings] Failed to listen to config, falling back to default:', error);
          set({ maxOrdersPerSlot: DEFAULT_SLOT_SETTINGS.maxOrdersPerSlot, isLoading: false });
        }
      );

      set({ unsubscribe: unsub });
      return unsub;
    } catch (error) {
      console.warn('[SlotSettings] Error in initialize listener:', error);
      set({ maxOrdersPerSlot: DEFAULT_SLOT_SETTINGS.maxOrdersPerSlot, isLoading: false });
      return () => {};
    }
  },

  fetchSettings: async () => {
    try {
      set({ isLoading: true });
      const activeDb = adminAuth.currentUser ? adminDb : db;
      const configRef = doc(activeDb, 'config', 'slotSettings');
      const snap = await getDoc(configRef);

      if (snap.exists()) {
        const data = snap.data();
        const val = data?.maxOrdersPerSlot;
        if (typeof val === 'number' && val >= MIN_ORDERS_PER_SLOT && val <= MAX_ORDERS_PER_SLOT_LIMIT) {
          set({ maxOrdersPerSlot: val, isLoading: false });
          return val;
        }
      }
      set({ maxOrdersPerSlot: DEFAULT_SLOT_SETTINGS.maxOrdersPerSlot, isLoading: false });
      return DEFAULT_SLOT_SETTINGS.maxOrdersPerSlot;
    } catch (error) {
      console.error('[SlotSettings] Error fetching slot settings:', error);
      set({ isLoading: false });
      return get().maxOrdersPerSlot;
    }
  },

  updateMaxOrdersPerSlot: async (newLimit: number) => {
    // Clamp to valid range
    const clampedLimit = Math.max(MIN_ORDERS_PER_SLOT, Math.min(MAX_ORDERS_PER_SLOT_LIMIT, Math.round(newLimit)));
    const previousLimit = get().maxOrdersPerSlot;

    // Optimistically update local state
    set({ maxOrdersPerSlot: clampedLimit });

    try {
      const activeDb = adminAuth.currentUser ? adminDb : db;
      const configRef = doc(activeDb, 'config', 'slotSettings');

      await setDoc(
        configRef,
        {
          maxOrdersPerSlot: clampedLimit,
          updatedAt: new Date().toISOString(),
          updatedBy: adminAuth.currentUser?.phoneNumber || 'admin',
        },
        { merge: true }
      );
    } catch (error) {
      console.error('[SlotSettings] Error updating slot capacity:', error);
      // Revert optimistic update on failure
      set({ maxOrdersPerSlot: previousLimit });
      throw error;
    }
  },
}));
