import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot } from '../services/firebase';
import { db } from '../services/firebase';

/**
 * Only 4 active services that customers can order:
 * - wash_fold: Wash & Fold
 * - wash_iron: Wash & Iron
 * - ironing: Steam Iron
 * - blanket_wash: Blanket Wash
 */
export interface ServiceAvailability {
  wash_fold: boolean;
  wash_iron: boolean;
  ironing: boolean;
  blanket_wash: boolean;
}

const DEFAULT_AVAILABILITY: ServiceAvailability = {
  wash_fold: true,
  wash_iron: true,
  ironing: true,
  blanket_wash: true,
};

interface ServiceAvailabilityState {
  availability: ServiceAvailability;
  isLoading: boolean;
  unsubscribe: (() => void) | null;
  fetchAvailability: () => Promise<void>;
  toggleService: (serviceId: keyof ServiceAvailability, enabled: boolean) => Promise<void>;
  isServiceAvailable: (serviceId: keyof ServiceAvailability) => boolean;
}

export const useServiceAvailabilityStore = create<ServiceAvailabilityState>((set, get) => ({
  availability: DEFAULT_AVAILABILITY,
  isLoading: true,
  unsubscribe: null,

  fetchAvailability: async () => {
    try {
      set({ isLoading: true });

      const configRef = doc(db, 'config', 'serviceAvailability');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data();
        // Only keep the 4 active services, ignore any extra fields from Firestore
        set({
          availability: {
            wash_fold: data.wash_fold ?? true,
            wash_iron: data.wash_iron ?? true,
            ironing: data.ironing ?? true,
            blanket_wash: data.blanket_wash ?? true,
          },
          isLoading: false
        });
      } else {
        // Initialize with defaults
        await setDoc(configRef, DEFAULT_AVAILABILITY);
        set({
          availability: DEFAULT_AVAILABILITY,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error fetching service availability:', error);
      set({ isLoading: false });
    }
  },

  toggleService: async (serviceId, enabled) => {
    try {
      const newAvailability = { ...get().availability, [serviceId]: enabled };
      set({ availability: newAvailability });

      // Persist to Firestore - only save the 4 active services
      await setDoc(doc(db, 'config', 'serviceAvailability'), newAvailability);
    } catch (error) {
      console.error('Error toggling service availability:', error);
      // Revert on error
      await get().fetchAvailability();
    }
  },

  isServiceAvailable: (serviceId) => {
    const state = get();
    return state.availability[serviceId] ?? true;
  },
}));

// Service labels for display (only the 4 active services)
export const SERVICE_LABELS: Record<keyof ServiceAvailability, string> = {
  wash_fold: 'Wash & Fold',
  wash_iron: 'Wash & Iron',
  ironing: 'Steam Iron',
  blanket_wash: 'Blanket Wash',
};

// Get all service IDs (only the 4 active services)
export const ALL_SERVICES = Object.keys(DEFAULT_AVAILABILITY) as (keyof ServiceAvailability)[];

// Helper to check if a service ID is one of our active services
export const isActiveService = (serviceId: string): serviceId is keyof ServiceAvailability => {
  return serviceId in DEFAULT_AVAILABILITY;
};