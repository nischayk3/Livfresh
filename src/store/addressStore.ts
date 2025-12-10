import { create } from 'zustand';

interface Address {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  createdAt: Date;
}

interface AddressState {
  currentAddress: string;
  currentLatitude: number;
  currentLongitude: number;
  savedAddresses: Address[];
  setCurrentAddress: (address: string, lat: number, lng: number) => void;
  clearCurrentAddress: () => void;
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => void;
  updateAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  setPrimaryAddress: (id: string) => void;
}

export const useAddressStore = create<AddressState>((set) => ({
  currentAddress: '',
  currentLatitude: 0,
  currentLongitude: 0,
  savedAddresses: [],
  setCurrentAddress: (address, lat, lng) =>
    set({ currentAddress: address, currentLatitude: lat, currentLongitude: lng }),
  clearCurrentAddress: () =>
    set({ currentAddress: '', currentLatitude: 0, currentLongitude: 0 }),
  setAddresses: (addresses) =>
    set({ savedAddresses: addresses }),
  addAddress: (address) =>
    set((state) => ({ savedAddresses: [...state.savedAddresses, address] })),
  updateAddress: (updatedAddress) =>
    set((state) => ({
      savedAddresses: state.savedAddresses.map(a => a.id === updatedAddress.id ? updatedAddress : a)
    })),
  removeAddress: (id) =>
    set((state) => ({ savedAddresses: state.savedAddresses.filter(a => a.id !== id) })),
  setPrimaryAddress: (id) =>
    set((state) => ({
      savedAddresses: state.savedAddresses.map(a => ({
        ...a,
        isPrimary: a.id === id,
      })),
    })),
}));



