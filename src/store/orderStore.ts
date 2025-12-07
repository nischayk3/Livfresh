import { create } from 'zustand';

interface OrderState {
  serviceId: string;
  serviceName: string;
  quantity: number;
  quantityUnit: string;
  pricePerUnit: number;
  basePrice: number;
  ironingCount: number;
  specialInstructions: string;
  pickupDate: string;
  pickupTimeSlot: string;
  totalPrice: number;
  setService: (id: string, name: string, pricePerUnit: number, unit: string) => void;
  setQuantity: (qty: number) => void;
  setIroningCount: (count: number) => void;
  setSpecialInstructions: (text: string) => void;
  setPickupDate: (date: string) => void;
  setPickupTimeSlot: (slot: string) => void;
  calculateTotalPrice: () => void;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  serviceId: '',
  serviceName: '',
  quantity: 0,
  quantityUnit: 'kg',
  pricePerUnit: 0,
  basePrice: 0,
  ironingCount: 0,
  specialInstructions: '',
  pickupDate: '',
  pickupTimeSlot: '',
  totalPrice: 0,
  setService: (id, name, pricePerUnit, unit) => 
    set({ serviceId: id, serviceName: name, pricePerUnit, quantityUnit: unit }),
  setQuantity: (qty) => {
    const { pricePerUnit } = get();
    set({ quantity: qty, basePrice: qty * pricePerUnit });
    get().calculateTotalPrice();
  },
  setIroningCount: (count) => {
    set({ ironingCount: count });
    get().calculateTotalPrice();
  },
  setSpecialInstructions: (text) => set({ specialInstructions: text }),
  setPickupDate: (date) => set({ pickupDate: date }),
  setPickupTimeSlot: (slot) => set({ pickupTimeSlot: slot }),
  calculateTotalPrice: () => {
    const { basePrice, ironingCount } = get();
    const ironingPrice = ironingCount * 10;
    set({ totalPrice: basePrice + ironingPrice });
  },
  reset: () => set({
    serviceId: '',
    serviceName: '',
    quantity: 0,
    quantityUnit: 'kg',
    pricePerUnit: 0,
    basePrice: 0,
    ironingCount: 0,
    specialInstructions: '',
    pickupDate: '',
    pickupTimeSlot: '',
    totalPrice: 0,
  }),
}));



