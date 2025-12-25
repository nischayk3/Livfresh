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

// Get user profile
export const getUser = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as any;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
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
    // Since we are using Auth UIDs now, we can't construct the ID from phone.
    // We must query the collection.
    // NOTE: This query will likely fail if the user is unauthenticated and rules block "list" operations.
    // In that case, we return null, treating them as a new/unknown user, which flows into the Signup->OTP process perfectly.
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as any;
    }
    return null;
  } catch (error) {
    console.log('User lookup failed (likely permissions), proceeding as new user:', error);
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
// Add address (Appends to savedAddresses array)
export const addAddress = async (
  userId: string,
  label: string,
  address: string,
  latitude: number,
  longitude: number,
  isPrimary: boolean = false
) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    let currentAddresses: any[] = [];

    if (userSnap.exists()) {
      currentAddresses = userSnap.data().savedAddresses || [];
    }

    const newAddress = {
      id: Date.now().toString(), // Simple ID generation
      label,
      address,
      latitude,
      longitude,
      isPrimary,
      createdAt: Timestamp.now(),
    };

    // If new address is primary, unset others
    if (isPrimary) {
      currentAddresses = currentAddresses.map(addr => ({ ...addr, isPrimary: false }));
    }

    const updatedAddresses = [...currentAddresses, newAddress];

    await updateDoc(userRef, {
      savedAddresses: updatedAddresses,
      updatedAt: Timestamp.now(),
    });

    return newAddress;
  } catch (error: any) {
    console.error('Error adding address:', error);
    throw error;
  }
};

// Get user addresses
export const getUserAddresses = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const addresses = userSnap.data().savedAddresses || [];
      // Sort by createdAt desc if possible, but they are stored in array. 
      // Let's reverse them to show newest first if we append to end.
      return addresses.reverse();
    }
    return [];
  } catch (error: any) {
    console.error('Error getting addresses:', error);
    throw error;
    console.error('Error getting addresses:', error);
    throw error;
  }
};

// Update address
export const updateUserAddress = async (userId: string, updatedAddress: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      let addresses = userSnap.data().savedAddresses || [];

      // If setting as primary, unset others
      if (updatedAddress.isPrimary) {
        addresses = addresses.map((addr: any) => ({ ...addr, isPrimary: false }));
      }

      const newAddresses = addresses.map((addr: any) =>
        addr.id === updatedAddress.id ? { ...updatedAddress, updatedAt: Timestamp.now() } : addr
      );

      await updateDoc(userRef, {
        savedAddresses: newAddresses,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error: any) {
    console.error('Error updating address:', error);
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

    const cleanOrder = cleanData(orderWithTimestamp);

    // Save to user orders
    await setDoc(doc(db, 'users', userId, 'orders', orderId), cleanOrder);

    // Mirror to vendor orders
    await setDoc(doc(db, 'vendors', orderData.vendorId, 'orders', orderId), {
      ...cleanOrder,
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

// --- Cart Management ---

// Helper to remove undefined values
// Helper to remove undefined values
const cleanData = (data: any): any => {
  if (data === undefined) return null;
  if (data === null) return null;

  if (Array.isArray(data)) {
    return data
      .map(cleanData)
      .filter((item) => item !== undefined && item !== null);
  } else if (typeof data === 'object') {
    // Check if it's a Firestore Timestamp or Date, return as is
    if (data instanceof Timestamp || data instanceof Date) return data;

    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        const cleaned = cleanData(value);
        if (cleaned !== undefined) { // Allow nulls, but not undefined
          acc[key] = cleaned;
        }
      }
      return acc;
    }, {} as any);
  }
  return data;
};

// Save cart to Firestore
export const saveCart = async (userId: string, cartItems: any[]) => {
  try {
    // Store cart inside the user document to avoid subcollection permission issues
    const userRef = doc(db, 'users', userId);
    const cleanItems = cleanData(cartItems);

    // We use setDoc with merge to ensure we don't overwrite other user data
    // and to create the document if it somehow doesn't exist (though it should)
    await setDoc(userRef, {
      activeCart: cleanItems,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error: any) {
    console.error('Error saving cart:', error);
    throw error;
  }
};

// Get cart from Firestore
export const getCart = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().activeCart || [];
    }
    return [];
  } catch (error: any) {
    console.error('Error getting cart:', error);
    throw error;
  }
};

// Clear cart in Firestore
export const clearCartInFirestore = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      activeCart: [],
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Error clearing cart in Firestore:', error);
    throw error;
  }
}







// --- Subscription Management ---

/**
 * Creates a new subscription for a user (Web)
 * @param userId - Firebase Auth UID
 * @param data - Subscription details
 */
export async function createSubscription(userId: string, data: any) {
  try {
    const subscriptionsRef = collection(db, 'users', userId, 'subscriptions');
    const subDoc = doc(subscriptionsRef);
    const subId = subDoc.id;

    const subscriptionWithTimestamp = {
      ...data,
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      startDate: Timestamp.now(),
      endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
    };

    const cleanedData = cleanData(subscriptionWithTimestamp);

    // 1. Save to subcollection
    await setDoc(subDoc, cleanedData);

    // 2. Update user document
    const userUpdate: any = {
      subscriptionStatus: 'active',
      subscriptionType: data.type,
      subscriptionExpiry: cleanedData.endDate,
      subscriptionSchedule: data.schedule || null,
      updatedAt: Timestamp.now(),
    };

    if (data.type === 'credits') {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const currentCredits = userSnap.exists() ? (userSnap.data().credits || 0) : 0;
      userUpdate.credits = currentCredits + (data.creditAmount || 0);
    }

    await updateDoc(doc(db, 'users', userId), userUpdate);

    return subId;
  } catch (error: any) {
    console.error('Error creating subscription (Web):', error);
    throw error;
  }
}

/**
 * Cancels a user's active subscription (Web)
 * @param userId - Firebase Auth UID
 */
export async function cancelSubscription(userId: string) {
  try {
    // 1. Update user document to inactive and clear credits
    await updateDoc(doc(db, 'users', userId), {
      subscriptionStatus: 'inactive',
      credits: 0,
      updatedAt: Timestamp.now()
    });

    // 2. Find and update the active subscription in subcollection
    const subsRef = collection(db, 'users', userId, 'subscriptions');
    const q = query(subsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    // Using Promise.all to ensure all updates complete
    const updates = snapshot.docs.map(docSnap =>
      updateDoc(doc(db, 'users', userId, 'subscriptions', docSnap.id), {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    );

    await Promise.all(updates);

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}
