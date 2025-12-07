import { create } from 'zustand';

export interface CartItem {
  id: string;
  vendorId: string;
  vendorName: string;
  serviceId: string;
  serviceName: string;
  serviceType: 'wash_fold' | 'wash_iron' | 'blanket_wash' | 'shoe_clean' | 'dry_clean' | 'premium_laundry';
  
  // Service-specific data
  weight?: number; // For wash services (kg)
  clothesCount?: number; // For wash services
  blanketType?: 'single' | 'double'; // For blanket wash
  blanketQuantity?: number;
  shoeType?: string; // For shoe cleaning
  shoeQuantity?: number;
  dryCleanWeight?: 'light' | 'medium' | 'heavy'; // For dry cleaning
  dryCleanItems?: { type: string; quantity: number; price: number }[]; // For dry cleaning
  
  // Add-ons
  ironingEnabled?: boolean;
  ironingCount?: number;
  ironingPrice?: number;
  
  // Other
  specialInstructions?: string;
  basePrice: number;
  totalPrice: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (item) => {
    const newItem = {
      ...item,
      id: `${item.serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => ({ items: [...state.items, newItem] }));
  },
  
  removeItem: (itemId) => {
    set((state) => ({ items: state.items.filter(item => item.id !== itemId) }));
  },
  
  updateItem: (itemId, updates) => {
    set((state) => ({
      items: state.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotalAmount: () => {
    return get().items.reduce((total, item) => total + item.totalPrice, 0);
  },
  
  getItemCount: () => {
    return get().items.length;
  },
}));


