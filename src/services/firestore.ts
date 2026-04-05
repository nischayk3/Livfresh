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
  onSnapshot,
  runTransaction,
} from './firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from './firebase';
import { generateOTP } from '../utils/otpHelpers';
import { SLOT_CONSTANTS } from '../utils/slotUtils';

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

// Upload service photos to Firebase Storage
export const uploadServicePhotos = async (photoUris: string[], orderId: string): Promise<string[]> => {
  try {
    const storage = getStorage();
    const uploadPromises = photoUris.map(async (uri, index) => {
      // Fetch the image from local URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a reference to the storage location
      const storageRef = ref(storage, `orders/${orderId}/photo_${index}_${Date.now()}.jpg`);

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading photos:', error);
    throw new Error('Failed to upload photos');
  }
};

// Create new user
export const createUser = async (
  userId: string,
  phone: string,
  name: string,
  email?: string,
  gender?: string,
  referralCode?: string
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      phone,
      name,
      email: email || '',
      gender: gender || '',
      referralCode: referralCode || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
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

// Check slot availability — returns only FULLY-OCCUPIED slots (count >= MAX_ORDERS_PER_SLOT)
export const checkSlotAvailability = async (date: string): Promise<string[]> => {
  try {
    const scheduleRef = doc(db, 'daily_schedules', date);
    const scheduleSnap = await getDoc(scheduleRef);
    if (scheduleSnap.exists()) {
      const data = scheduleSnap.data();
      // New format: slot_counts map { "10:00 - 11:00": 1, ... }
      if (data.slot_counts) {
        return Object.entries(data.slot_counts)
          .filter(([_, count]) => (count as number) >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT)
          .map(([slot]) => slot);
      }
      // Legacy fallback: old occupied_slots array → treat each as count=1 (not full under new rules)
      return [];
    }
    return [];
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return [];
  }
};

// Create order with slot reservation (Transaction)
export const createOrder = async (userId: string, orderData: any) => {
  try {
    const { pickupDetails } = orderData;
    const isScheduled = pickupDetails?.type === 'scheduled';
    const scheduleDate = pickupDetails?.scheduledDate; // YYYY-MM-DD
    const scheduleTime = pickupDetails?.scheduledTime; // "10:00 - 10:30"

    const ordersRef = collection(db, 'users', userId, 'orders');
    const orderId = doc(ordersRef).id; // Generate ID offline

    // Generate pickup OTP (4-digit)
    const pickupOTP = generateOTP();

    const orderWithTimestamp = {
      ...orderData,
      pickupOTP,
      status: orderData.status || 'confirmed',
      pickupVerified: false,
      deliveryOTP: null,
      deliveryVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const cleanOrder = cleanData(orderWithTimestamp);

    await runTransaction(db, async (transaction) => {
      // 1. Reserve slot for ALL order types (instant AND scheduled).
      //    Both consume the same delivery-partner capacity, so both must
      //    write to daily_schedules to prevent double-booking.
      if (scheduleDate && scheduleTime) {
        const scheduleRef = doc(db, 'daily_schedules', scheduleDate);
        const scheduleSnap = await transaction.get(scheduleRef);

        const slotCounts: Record<string, number> = scheduleSnap.exists()
          ? (scheduleSnap.data().slot_counts || {})
          : {};
        const currentCount = slotCounts[scheduleTime] || 0;

        if (currentCount >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT) {
          throw new Error(`This time slot is no longer available. Please try a different time.`);
        }

        // Atomically increment the slot count
        transaction.set(scheduleRef, {
          slot_counts: { ...slotCounts, [scheduleTime]: currentCount + 1 }
        }, { merge: true });
      }

      // 2. Create User Order
      const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
      transaction.set(userOrderRef, cleanOrder);

      // 3. Mirror to Vendor Order
      const vendorId = orderData.vendorId || 'default';
      const vendorOrderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
      transaction.set(vendorOrderRef, {
        ...cleanOrder,
        userId,
        userPhone: orderData.userPhone || '',
      });
    });

    return orderId;
  } catch (error: any) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get user orders (one-time fetch)
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

/**
 * Subscribe to user orders in real-time
 */
export const subscribeToUserOrders = (userId: string, callback: (orders: any[]) => void) => {
  const ordersRef = collection(db, 'users', userId, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  }, (error) => {
    console.error('Error subscribing to user orders:', error);
  });
};

/**
 * Subscribe to all orders (Admin use)
 */
export const subscribeToAllOrders = (callback: (orders: any[]) => void) => {
  // We need to fetch from a top-level collection if we have one, 
  // or use a collectionGroup query if appropriate.
  // In this project, mirrored orders are in vendors/{vendorId}/orders
  const vendorId = 'vendor_1'; // Standardizing on vendor_1 for now
  const ordersRef = collection(db, 'vendors', vendorId, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  }, (error) => {
    console.error('Error subscribing to all orders:', error);
  });
};

// Get single order (one-time fetch)
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

/**
 * Subscribe to a single order in real-time
 */
export const subscribeToOrder = (userId: string, orderId: string, callback: (order: any) => void) => {
  const orderRef = doc(db, 'users', userId, 'orders', orderId);

  return onSnapshot(orderRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to order:', error);
  });
};

// Update order status with OTP verification support
export const updateOrderStatus = async (
  userId: string,
  orderId: string,
  status: string,
  options?: {
    verifyPickup?: boolean;
    verifyDelivery?: boolean;
    tokenNumber?: string;
    pickupOTP?: string; // For verification
    deliveryOTP?: string; // For verification
  }
) => {
  try {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }

    const currentOrder = orderSnap.data();
    const vendorId = currentOrder.vendorId || 'vendor_1';
    const timestamp = Timestamp.now();

    const updateData: any = {
      status,
      updatedAt: timestamp,
    };

    // Generate delivery OTP when order becomes ready
    if (status === 'ready' && !currentOrder.deliveryOTP) {
      updateData.deliveryOTP = generateOTP();
    }

    // Verify pickup OTP
    if (options?.verifyPickup) {
      if (options.pickupOTP !== currentOrder.pickupOTP) {
        throw new Error('Invalid pickup OTP');
      }
      updateData.pickupVerified = true;
      updateData.pickedUpAt = timestamp;
    }

    // Verify delivery OTP
    if (options?.verifyDelivery) {
      if (options.deliveryOTP !== currentOrder.deliveryOTP) {
        throw new Error('Invalid delivery OTP');
      }
      updateData.deliveryVerified = true;
      updateData.deliveredAt = timestamp;
    }

    // Add token number
    if (options?.tokenNumber) {
      updateData.tokenNumber = options.tokenNumber;
    }

    // Update user order
    await updateDoc(orderRef, updateData);

    // Update vendor order
    await updateDoc(doc(db, 'vendors', vendorId, 'orders', orderId), updateData);

    return true;
  } catch (error: any) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Generate delivery OTP for an order (when order becomes ready)
 */
export const generateDeliveryOTP = async (userId: string, orderId: string): Promise<string> => {
  try {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }

    const deliveryOTP = generateOTP();
    const currentOrder = orderSnap.data();
    const vendorId = currentOrder.vendorId || 'vendor_1';

    await updateDoc(orderRef, {
      deliveryOTP,
      updatedAt: Timestamp.now(),
    });

    // Also update vendor order
    await updateDoc(doc(db, 'vendors', vendorId, 'orders', orderId), {
      deliveryOTP,
      updatedAt: Timestamp.now(),
    });

    return deliveryOTP;
  } catch (error: any) {
    console.error('Error generating delivery OTP:', error);
    throw error;
  }
};

/**
 * Get all busy delivery slots for a specific date
 */
export const getBusySlots = async (deliveryDate: string, vendorId: string = 'vendor_1'): Promise<string[]> => {
  try {
    const ordersRef = collection(db, 'vendors', vendorId, 'orders');
    const q = query(
      ordersRef,
      where('deliveryDate', '==', deliveryDate),
      where('isCancelled', '!=', true) // Don't count slots from cancelled orders
    );
    const querySnapshot = await getDocs(q);
    const busySlots: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.deliveryTime) {
        busySlots.push(data.deliveryTime);
      }
    });
    return busySlots;
  } catch (error) {
    console.error('Error fetching busy slots:', error);
    return [];
  }
};

/**
 * Schedule delivery for an order
 */
/**
 * Schedule delivery for an order (Transaction)
 */
export const scheduleOrderDelivery = async (
  userId: string,
  orderId: string,
  deliveryDate: string,
  deliveryTime: string
): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Check & Reserve Slot in Global Schedule
      const scheduleRef = doc(db, 'daily_schedules', deliveryDate);
      const scheduleSnap = await transaction.get(scheduleRef);

      const slotCounts: Record<string, number> = scheduleSnap.exists()
        ? (scheduleSnap.data().slot_counts || {})
        : {};
      const currentCount = slotCounts[deliveryTime] || 0;

      if (currentCount >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT) {
        throw new Error(`Slot ${deliveryTime} is no longer available.`);
      }

      // 2. Update Order
      const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
      const userOrderSnap = await transaction.get(userOrderRef);

      if (!userOrderSnap.exists()) {
        throw new Error('Order not found');
      }

      const orderData = userOrderSnap.data();
      const vendorId = orderData.vendorId || 'vendor_1'; // fallback
      const timestamp = Timestamp.now();

      const updateData = {
        deliveryDate,
        deliveryTime,
        deliveryScheduledAt: timestamp,
        updatedAt: timestamp,
      };

      // 3. Perform Writes
      // Reserve Slot (increment count)
      transaction.set(scheduleRef, {
        slot_counts: { ...slotCounts, [deliveryTime]: currentCount + 1 }
      }, { merge: true });

      // Update both user and vendor orders
      transaction.update(userOrderRef, updateData);

      const vendorOrderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
      transaction.update(vendorOrderRef, updateData);
    });

    return true;
  } catch (error) {
    console.error('Error scheduling delivery:', error);
    throw error;
  }
};

// --- Geofencing / Demand Logging ---

export const logUnserviceableRequest = async (
  userId: string,
  location: { latitude: number; longitude: number; address?: string }
) => {
  try {
    await addDoc(collection(db, 'unserviceable_requests'), {
      userId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      address: location.address || 'Unknown Address',
      timestamp: Timestamp.now(),
      status: 'new', // For admin to review/acknowledge
    });
    console.log('Unserviceable request logged');
  } catch (error) {
    console.error('Error logging unserviceable request:', error);
    // Don't throw, just log. We don't want to block the UI flow if logging fails.
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
    // safer check than instanceof which can fail across bundles
    if (data instanceof Date || (data && typeof data.toDate === 'function') || (data && data.seconds !== undefined && data.nanoseconds !== undefined)) return data;

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
