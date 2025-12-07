import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

// Get vendor data
export const getVendor = async (vendorId: string) => {
  const vendorRef = doc(db, 'vendors', vendorId);
  const vendorSnap = await getDoc(vendorRef);
  if (vendorSnap.exists()) {
    return { id: vendorSnap.id, ...vendorSnap.data() };
  }
  return null;
};

// Get all vendors
export const getAllVendors = async () => {
  try {
    const vendorsRef = collection(db, 'vendors');
    const q = query(vendorsRef, where('active', '==', true), orderBy('rating', 'desc'));
    const vendorsSnap = await getDocs(q);
    return vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error('Error getting vendors:', error);
    throw error;
  }
};

// Get vendors by area
export const getVendorsByArea = async (area: string) => {
  try {
    const vendorsRef = collection(db, 'vendors');
    const q = query(
      vendorsRef, 
      where('active', '==', true),
      where('area', '==', area),
      orderBy('rating', 'desc')
    );
    const vendorsSnap = await getDocs(q);
    return vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error('Error getting vendors by area:', error);
    throw error;
  }
};

// Get vendor services
export const getVendorServices = async (vendorId: string) => {
  const servicesRef = collection(db, 'vendors', vendorId, 'services');
  const servicesSnap = await getDocs(servicesRef);
  return servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Check if user exists by phone number
export const checkUserExists = async (phone: string) => {
  try {
    const userId = `phone_${phone.replace(/[^0-9]/g, '')}`;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  } catch (error) {
    console.error('Error checking user:', error);
    return null;
  }
};

// Create new user
export const createUser = async (
  userId: string, 
  phone: string, 
  name: string,
  email?: string,
  gender?: string
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      phone,
      name,
      email: email || '',
      gender: gender || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`✅ User created: ${userId}`);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'permission-denied') {
      throw new Error(
        'Firestore permission error.\n' +
        'Please update Firestore security rules:\n' +
        'allow create: if request.auth != null;\n'
      );
    }
    throw error;
  }
};

// Update existing user
export const updateUser = async (
  userId: string,
  data: { name?: string; email?: string; gender?: string }
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    console.log(`✅ User updated: ${userId}`);
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Add address
export const addAddress = async (
  userId: string, 
  label: string, 
  address: string, 
  latitude: number, 
  longitude: number,
  isPrimary: boolean = false
) => {
  try {
    const addressesRef = collection(db, 'users', userId, 'addresses');
    const addressData = {
      label,
      address,
      latitude,
      longitude,
      isPrimary,
      createdAt: Timestamp.now(),
    };
    
    // If this is primary, unset other primary addresses
    if (isPrimary) {
      const existingAddresses = await getDocs(addressesRef);
      const updatePromises = existingAddresses.docs.map(doc => {
        if (doc.data().isPrimary) {
          return updateDoc(doc.ref, { isPrimary: false });
        }
      });
      await Promise.all(updatePromises);
    }
    
    return await addDoc(addressesRef, addressData);
  } catch (error: any) {
    console.error('Error adding address:', error);
    throw error;
  }
};

// Get user addresses
export const getUserAddresses = async (userId: string) => {
  try {
    const addressesRef = collection(db, 'users', userId, 'addresses');
    const addressesSnap = await getDocs(query(addressesRef, orderBy('createdAt', 'desc')));
    return addressesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error('Error getting addresses:', error);
    throw error;
  }
};

// Create order
export const createOrder = async (userId: string, orderData: any) => {
  try {
    const ordersRef = collection(db, 'users', userId, 'orders');
    const orderId = doc(ordersRef).id;
    
    const orderWithTimestamp = {
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    // Save to user orders
    await setDoc(doc(db, 'users', userId, 'orders', orderId), orderWithTimestamp);
    
    // Mirror to vendor orders
    await setDoc(doc(db, 'vendors', orderData.vendorId, 'orders', orderId), {
      ...orderWithTimestamp,
      userId,
      userPhone: orderData.userPhone || '',
    });
    
    return orderId;
  } catch (error: any) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get user orders
export const getUserOrders = async (userId: string) => {
  try {
    const ordersRef = collection(db, 'users', userId, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const ordersSnap = await getDocs(q);
    return ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error('Error getting orders:', error);
    throw error;
  }
};

// Get single order
export const getOrder = async (userId: string, orderId: string) => {
  try {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      return { id: orderSnap.id, ...orderSnap.data() };
    }
    return null;
  } catch (error: any) {
    console.error('Error getting order:', error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (userId: string, orderId: string, status: string) => {
  try {
    const vendorId = 'vendor_1';
    const timestamp = Timestamp.now();
    
    // Update user order
    await updateDoc(doc(db, 'users', userId, 'orders', orderId), {
      status,
      updatedAt: timestamp,
    });
    
    // Update vendor order
    await updateDoc(doc(db, 'vendors', vendorId, 'orders', orderId), {
      status,
      updatedAt: timestamp,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    throw error;
  }
};
