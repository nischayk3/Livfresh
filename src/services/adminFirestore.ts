import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  setDoc,
  writeBatch,
  collectionGroup,
  onSnapshot,
  runTransaction,
} from './firebase';
import { adminDb as db } from './firebase';
import { generateOTP } from '../utils/otpHelpers';
import { SLOT_CONSTANTS } from '../utils/slotUtils';

/**
 * Get list of admin phone numbers from Firestore config
 * Stored as a map for easy lookup in security rules: { "9108558715": true, "SECOND_NUMBER": true }
 */
export const getAdminPhones = async (): Promise<string[]> => {
  try {
    const configRef = doc(db, 'config', 'adminPhones');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      // Convert map to array
      if (data.adminPhones && typeof data.adminPhones === 'object') {
        return Object.keys(data.adminPhones).filter(key => data.adminPhones[key] === true);
      }
      // Fallback to array format (legacy)
      return data.adminPhones || [];
    }

    // If config doesn't exist, create it with default admin phones as a map
    const defaultAdminPhones = { '9108558715': true }; // Add second number later
    await setDoc(configRef, {
      adminPhones: defaultAdminPhones,
      updatedAt: Timestamp.now(),
    });

    return Object.keys(defaultAdminPhones);
  } catch (error) {
    console.error('Error getting admin phones:', error);
    // Fallback to hardcoded list if Firestore fails
    return ['9108558715'];
  }
};

/**
 * Check if a phone number is an admin phone
 */
export const isAdminPhone = async (phone: string): Promise<boolean> => {
  const AUTHORIZED_ADMINS = ['9661802634', '9852030638', '9108558715'];

  try {
    const configRef = doc(db, 'config', 'adminPhones');
    const configSnap = await getDoc(configRef);

    // Clean input phone: remove +91 prefix and get last 10 digits
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

    if (!configSnap.exists()) {
      // Fallback to hardcoded check if config doesn't exist
      return AUTHORIZED_ADMINS.includes(cleanPhone);
    }

    const data = configSnap.data();
    const adminPhones = data.adminPhones || {};

    // Check if phone exists in map (preferred)
    if (typeof adminPhones === 'object' && !Array.isArray(adminPhones)) {
      if (adminPhones[cleanPhone] === true) return true;
    }

    // Fallback to array check or hardcoded list
    const adminPhonesArray = Array.isArray(adminPhones) ? adminPhones : Object.keys(adminPhones);
    const isAuthorized = adminPhonesArray.some((adminPhone: string) => {
      const cleanAdminPhone = adminPhone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
      return cleanAdminPhone === cleanPhone;
    });

    return isAuthorized || AUTHORIZED_ADMINS.indexOf(cleanPhone) !== -1;
  } catch (error) {
    console.error('Error checking admin phone:', error);
    // Safe fallback to hardcoded list
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    return AUTHORIZED_ADMINS.indexOf(cleanPhone) !== -1;
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (): Promise<{
  totalUsers: number;
  activeUsers: number;
  currentUser: any | null;
}> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    const totalUsers = usersSnap.size;
    let activeUsers = 0;

    // We can use collectionGroup for orders to find active users more efficiently?
    // Actually, iterating users is okay for small scale, but let's try to be safe.
    // If permission denied on list users, we might get 0.

    // Attempting to calculate active users via orders collection group
    // This requires reading ALL orders which is also expensive, but safe.
    const ordersQuery = query(collectionGroup(db, 'orders'));
    const ordersSnap = await getDocs(ordersQuery);

    const activeUserIds = new Set();
    ordersSnap.docs.forEach(doc => {
      const order = doc.data();
      if (order.status && order.status !== 'cancelled') {
        // The order doc might have userId, or we can look at ref.parent.parent.id
        const userId = order.userId || doc.ref.parent.parent?.id;
        if (userId) activeUserIds.add(userId);
      }
    });

    activeUsers = activeUserIds.size;

    return {
      totalUsers,
      activeUsers,
      currentUser: null,
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      currentUser: null,
    };
  }
};

/**
 * Get order statistics for today
 */
export const getOrderStats = async (): Promise<{
  total: number;
  confirmed: number;
  pickup_completed: number;
  processing: number;
  ready: number;
  out_for_delivery: number;
  delivered: number;
}> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = Timestamp.fromDate(today);
    const todayEnd = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000));

    let total = 0;
    let confirmed = 0;
    let pickup_completed = 0;
    let processing = 0;
    let ready = 0;
    let out_for_delivery = 0;
    let delivered = 0;

    // Use Collection Group Query to get ALL orders across the system
    const ordersQuery = query(collectionGroup(db, 'orders'));
    const ordersSnap = await getDocs(ordersQuery);

    const todayStartTime = todayStart.toMillis ? todayStart.toMillis() : (todayStart instanceof Date ? todayStart.getTime() : 0);
    const todayEndTime = todayEnd.toMillis ? todayEnd.toMillis() : (todayEnd instanceof Date ? todayEnd.getTime() : 0);

    const seenOrderIds = new Set<string>();

    ordersSnap.docs.forEach((orderDoc) => {
      const orderId = orderDoc.id;
      if (seenOrderIds.has(orderId)) return; // Deduplicate

      const order = orderDoc.data();

      // Check if order was created today
      const orderCreatedAt = order.createdAt;
      if (!orderCreatedAt) return;

      const getTime = (date: any) => {
        if (!date) return 0;
        if (date.toMillis) return date.toMillis();
        if (date.toDate) return date.toDate().getTime();
        if (date instanceof Date) return date.getTime();
        return new Date(date).getTime() || 0;
      };

      const orderTime = getTime(orderCreatedAt);

      // Check if order is from today
      if (orderTime >= todayStartTime && orderTime < todayEndTime) {
        const status = order.status || 'pending';

        // Skip cancelled orders for stats - they shouldn't count towards today's total or status breakdown
        if (status === 'cancelled') return;

        seenOrderIds.add(orderId);
        total++;

        switch (status) {
          case 'confirmed':
          case 'placed':
            confirmed++;
            break;
          case 'pickup_completed':
            pickup_completed++;
            break;
          case 'processing':
            processing++;
            break;
          case 'ready':
            ready++;
            break;
          case 'out_for_delivery':
            out_for_delivery++;
            break;
          case 'delivered':
            delivered++;
            break;
        }
      }
    });

    return {
      total,
      confirmed,
      pickup_completed,
      processing,
      ready,
      out_for_delivery,
      delivered,
    };
  } catch (error) {
    console.error('Error getting order stats:', error);
    return {
      total: 0,
      confirmed: 0,
      pickup_completed: 0,
      processing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
    };
  }
};

/**
 * Get all orders from all users (for admin)
 */
export const getAllOrders = async (): Promise<any[]> => {
  try {
    // UPDATED: Use Collection Group Query without orderBy to avoid index requirement
    // We sort client-side at the end of this function
    console.log('[Admin] Fetching all orders via collectionGroup...');
    const ordersQuery = query(collectionGroup(db, 'orders'));
    const ordersSnap = await getDocs(ordersQuery);
    console.log(`[Admin] Fetched ${ordersSnap.size} orders from Firestore.`);

    // Deduplicate docs immediately to avoid redundant processing
    const uniqueDocsMap = new Map();
    ordersSnap.docs.forEach(doc => {
      if (!uniqueDocsMap.has(doc.id)) {
        uniqueDocsMap.set(doc.id, doc);
      }
    });

    const allOrders: any[] = [];
    const userCache: Record<string, any> = {};

    for (const orderDoc of Array.from(uniqueDocsMap.values())) {
      const order = orderDoc.data();
      // Robust userId extraction:
      // 1. Direct field in order
      // 2. Parent collection (users/{userId}/orders/{orderId}) -> parent.parent.id
      let userId = order.userId;
      if (!userId && orderDoc.ref.parent && orderDoc.ref.parent.parent) {
        userId = orderDoc.ref.parent.parent.id;
      }

      let userName = order.customerName || order.userName || 'Unknown';
      let userPhone = order.customerPhone || order.userPhone || '';
      const orderAddress = order.address || order.deliveryAddress || null;

      // If user details are missing in order, try to fetch from user doc
      if (userId && (userName === 'Unknown' || !userPhone)) {
        if (userCache[userId]) {
          userName = userCache[userId].name || userName;
          userPhone = userCache[userId].phone || userPhone;
        } else {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', userId));
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              userCache[userId] = userData;
              // Enriched data
              userName = userData.name || userName;
              userPhone = userData.phone || userPhone;
            }
          } catch (e) {
            console.warn(`[Admin] Failed to fetch user ${userId} for order ${orderDoc.id}`);
          }
        }
      }

      allOrders.push({
        id: orderDoc.id,
        userId: userId,
        customerName: userName,
        customerPhone: userPhone,
        address: orderAddress,
        ...order,
      });
    }

    const uniqueOrders = allOrders; // Already filtered above

    // Client-side sorting: Newest first (descending)
    uniqueOrders.sort((a, b) => {
      const getTime = (date: any) => {
        if (!date) return 0;
        if (typeof date === 'number') return date; // Already millis
        if (typeof date === 'string') return new Date(date).getTime();
        if (date.toDate && typeof date.toDate === 'function') return date.toDate().getTime(); // Firestore Timestamp
        if (date.seconds) return date.seconds * 1000; // Stripped Timestamp
        if (date instanceof Date) return date.getTime();
        return 0;
      };

      const timeA = getTime(a.createdAt);
      const timeB = getTime(b.createdAt);
      return timeB - timeA; // Descending
    });

    return uniqueOrders;
  } catch (error) {
    console.error('Error getting all orders:', error);
    return [];
  }
};

/**
 * Subscribe to all orders from all users in real-time (for admin)
 * Includes data enrichment for customer name/phone
 */
export const subscribeToAllOrdersAdmin = (callback: (orders: any[]) => void) => {
  console.log('[Admin] Subscribing to all orders via collectionGroup...');
  const ordersQuery = query(collectionGroup(db, 'orders'));
  const userCache: Record<string, any> = {};

  return onSnapshot(ordersQuery, async (snapshot) => {
    // Deduplicate docs immediately
    const uniqueDocsMap = new Map();
    snapshot.docs.forEach(doc => {
      if (!uniqueDocsMap.has(doc.id)) {
        uniqueDocsMap.set(doc.id, doc);
      }
    });

    const enrichedOrders: any[] = [];

    // Process all orders
    for (const orderDoc of Array.from(uniqueDocsMap.values())) {
      const orderData = orderDoc.data();
      let userId = orderData.userId;
      if (!userId && orderDoc.ref.parent && orderDoc.ref.parent.parent) {
        userId = orderDoc.ref.parent.parent.id;
      }

      let userName = orderData.customerName || orderData.userName || 'Unknown';
      let userPhone = orderData.customerPhone || orderData.userPhone || '';

      // Enrichment logic if missing detail
      if (userId && (userName === 'Unknown' || !userPhone)) {
        if (userCache[userId]) {
          userName = userCache[userId].name || userName;
          userPhone = userCache[userId].phone || userPhone;
        } else {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', userId));
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              userCache[userId] = userData;
              userName = userData.name || userName;
              userPhone = userData.phone || userPhone;
            }
          } catch (e) {
            console.warn(`[Admin] Enrichment failed for user ${userId}`);
          }
        }
      }

      enrichedOrders.push({
        id: orderDoc.id,
        userId: userId,
        customerName: userName,
        customerPhone: userPhone,
        address: orderData.address || orderData.deliveryAddress || null,
        ...orderData,
      });
    }

    // Client-side sorting: Newest first
    enrichedOrders.sort((a, b) => {
      const getTime = (date: any) => {
        if (!date) return 0;
        if (typeof date === 'number') return date;
        if (typeof date === 'string') return new Date(date).getTime();
        if (date.toDate && typeof date.toDate === 'function') return date.toDate().getTime();
        if (date.seconds) return date.seconds * 1000;
        return 0;
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    callback(enrichedOrders);
  }, (error) => {
    console.error('Error subscribing to all orders:', error);
  });
};

/**
 * Get revenue data for a date range
 */
export const getRevenue = async (startDate: Date, endDate: Date): Promise<{
  revenue: number;
  orderRevenue: number;
  subscriptionRevenue: number;
  orderCount: number;
  subscriptionCount: number;
  orders: any[];
}> => {
  try {
    const start = Timestamp.fromDate(startDate);
    const end = Timestamp.fromDate(endDate);

    let orderRevenue = 0;
    let subscriptionRevenue = 0;
    let orderCount = 0;
    let subscriptionCount = 0;
    const orders: any[] = [];

    const startTime = start.toMillis ? start.toMillis() : (start instanceof Date ? start.getTime() : 0);
    const endTime = end.toMillis ? end.toMillis() : (end instanceof Date ? end.getTime() : 0);

    const getTime = (date: any) => {
      if (!date) return 0;
      if (date.toMillis) return date.toMillis();
      if (date.toDate) return date.toDate().getTime();
      if (date instanceof Date) return date.getTime();
      return new Date(date).getTime() || 0;
    };

    // 1. Calculate Order Revenue (Collection Group)
    const ordersQuery = query(collectionGroup(db, 'orders'));
    const ordersSnap = await getDocs(ordersQuery);
    const seenOrderIds = new Set<string>();

    // Mapping for frequency calculation
    const userToOrders: Record<string, any[]> = {};
    const userProfiles: Record<string, any> = {};

    // First pass: Group all orders by user to calculate frequency later
    ordersSnap.docs.forEach((doc) => {
      const order = doc.data();
      const userId = order.userId || doc.ref.parent.parent?.id;
      if (!userId) return;

      if (!userToOrders[userId]) userToOrders[userId] = [];
      userToOrders[userId].push({
        id: doc.id,
        createdAt: getTime(order.createdAt || order.created_at),
        ...order
      });
    });

    // Sort user orders by date to determine sequence
    Object.keys(userToOrders).forEach(uid => {
      userToOrders[uid].sort((a, b) => a.createdAt - b.createdAt);
    });

    // Second pass: Filter orders in range and enrich
    for (const orderDoc of ordersSnap.docs) {
      const orderId = orderDoc.id;
      if (seenOrderIds.has(orderId)) continue;

      const order = orderDoc.data();
      const orderCreatedAt = order.createdAt || order.created_at;
      if (!orderCreatedAt) continue;

      const orderTime = getTime(orderCreatedAt);

      if (orderTime >= startTime && orderTime <= endTime) {
        const status = order.status || 'pending';
        if (status === 'cancelled') continue;

        seenOrderIds.add(orderId);
        const userId = order.userId || orderDoc.ref.parent.parent?.id;

        // Fetch user profile if not cached
        if (userId && !userProfiles[userId]) {
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists()) {
              userProfiles[userId] = userSnap.data();
            }
          } catch (e) {
            console.warn(`[Revenue] Failed to fetch user ${userId}`);
          }
        }

        const user = userProfiles[userId] || {};
        const amount = order.billDetails?.total || order.totalAmount || order.total || 0;

        // Calculate frequency
        const userOrders = userToOrders[userId] || [];
        const sequence = userOrders.findIndex(o => o.id === orderId) + 1;
        const frequency = sequence === 1 ? 'First time user' : `${sequence}${getOrdinalSuffix(sequence)} user`;

        orderRevenue += amount;
        orderCount++;

        orders.push({
          id: orderDoc.id,
          userId: userId,
          customerName: user.name || order.customerName || 'Unknown',
          customerPhone: user.phone || order.customerPhone || 'N/A',
          referralCode: user.referralCode || order.referralCode || '',
          orderFrequency: frequency,
          calculatedAmount: amount,
          // Robust address parsing
          formattedAddress: order.address
            ? (typeof order.address === 'string'
              ? order.address
              : `${order.address.houseNo || ''} ${order.address.addressLine || ''}, ${order.address.area || order.address.landmark || ''}, ${order.address.city || ''} - ${order.address.pincode || ''}`.replace(/,\s*,/g, ',').trim())
            : 'N/A',
          ...order
        });
      }
    }

    // Helper for ordinals
    function getOrdinalSuffix(i: number) {
      const j = i % 10, k = i % 100;
      if (j === 1 && k !== 11) return "st";
      if (j === 2 && k !== 12) return "nd";
      if (j === 3 && k !== 13) return "rd";
      return "th";
    }

    // 2. Calculate Subscription Revenue (Collection Group)
    const subsQuery = query(collectionGroup(db, 'subscriptions'));
    const subsSnap = await getDocs(subsQuery);

    subsSnap.docs.forEach((subDoc) => {
      const sub = subDoc.data();
      const purchasedAt = sub.purchasedAt || sub.purchased_at || sub.createdAt || sub.created_at;

      if (purchasedAt) {
        const purchaseTime = getTime(purchasedAt);

        // Check if subscription purchase is in date range
        if (purchaseTime >= startTime && purchaseTime <= endTime) {
          subscriptionRevenue += sub.totalAmount || 0;
          subscriptionCount++;
        }
      }
    });

    return {
      revenue: orderRevenue + subscriptionRevenue,
      orderRevenue,
      subscriptionRevenue,
      orderCount,
      subscriptionCount,
      orders,
    };
  } catch (error) {
    console.error('Error getting revenue:', error);
    return {
      revenue: 0,
      orderRevenue: 0,
      subscriptionRevenue: 0,
      orderCount: 0,
      subscriptionCount: 0,
      orders: [],
    };
  }
};

/**
 * Update order status (admin function)
 */
export const updateOrderStatusAdmin = async (
  userId: string,
  orderId: string,
  newStatus: string,
  options?: {
    verifyPickup?: boolean;
    verifyDelivery?: boolean;
    tokenNumber?: string;
    pickupOTP?: string;
    deliveryOTP?: string;
    additionalData?: any; // Allow arbitrary data (e.g., cancellation reason)
  }
): Promise<boolean> => {
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
      status: newStatus,
      updatedAt: timestamp,
      ...options?.additionalData // Merge additional data
    };

    // Generate delivery OTP when order becomes ready
    if (newStatus === 'ready' && !currentOrder.deliveryOTP) {
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
 * Get subscription statistics
 */
export const getSubscriptionStats = async (): Promise<{
  totalSubscribers: number;
  activeSubscribers: number;
  subscribers: any[];
}> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    let totalSubscribers = 0;
    let activeSubscribers = 0;
    const subscribers: any[] = [];

    for (const userDoc of usersSnap.docs) {
      try {
        const userData = userDoc.data();
        const subscriptionsRef = collection(db, 'users', userDoc.id, 'subscriptions');
        const subsSnap = await getDocs(subscriptionsRef);

        // Get all subscriptions (active and past)
        const allSubs = subsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Find active subscriptions
        const activeSubs = allSubs.filter((sub: any) => {
          const status = sub.status || 'active';
          const isActive = sub.isActive !== false;
          return status === 'active' && isActive;
        });

        // Include this user if they have ANY subscription (active or past)
        if (allSubs.length > 0) {
          totalSubscribers++;

          // For each subscription (active or past), add to the list
          allSubs.forEach((sub: any) => {
            const isActiveSubscription = sub.status === 'active' && sub.isActive !== false;

            if (isActiveSubscription) {
              activeSubscribers++;
            }

            subscribers.push({
              user_id: userDoc.id,
              phone: userData.phone || '',
              name: userData.name || '',
              plan_type: sub.planType || sub.plan_type || 'single',
              total_credits: sub.totalCredits || sub.total_credits || 0,
              credits_remaining: sub.creditsRemaining || sub.credits_remaining || 0,
              credits_used: sub.creditsUsed || sub.credits_used || 0,
              status: sub.status || 'active',
              expires_at: sub.expiresAt?.toDate ? sub.expiresAt.toDate().toISOString() : (sub.expiresAt || ''),
              created_at: sub.createdAt?.toDate ? sub.createdAt.toDate().toISOString() : (sub.createdAt || ''),
            });
          });
        }
      } catch (error: any) {
        console.warn(`Cannot access subscriptions for user ${userDoc.id}:`, error.message);
        continue;
      }
    }

    return {
      totalSubscribers,
      activeSubscribers,
      subscribers,
    };
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    return {
      totalSubscribers: 0,
      activeSubscribers: 0,
      subscribers: [],
    };
  }
};

/**
 * Add credits to a user (admin function)
 */
export const addCreditsAdmin = async (
  name: string,
  phone: string,
  planType: 'single' | 'couple',
  credits: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Normalize phone number - try multiple formats
    let normalizedPhone = phone.trim().replace(/\D/g, ''); // Remove all non-digits

    // Remove leading 0 if present
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = normalizedPhone.substring(1);
    }

    // If it's a 10-digit number, add +91 prefix
    const phoneWithPrefix = normalizedPhone.length === 10
      ? `+91${normalizedPhone}`
      : normalizedPhone.startsWith('91') && normalizedPhone.length === 12
        ? `+${normalizedPhone}`
        : normalizedPhone;

    // Find user by phone - try with +91 prefix first
    const usersRef = collection(db, 'users');
    let userSnap = await getDocs(query(usersRef, where('phone', '==', phoneWithPrefix)));

    // If not found, try without prefix (just the 10-digit number)
    if (userSnap.empty && normalizedPhone.length === 10) {
      userSnap = await getDocs(query(usersRef, where('phone', '==', normalizedPhone)));
    }

    // Also try with just +91 and the digits
    if (userSnap.empty) {
      userSnap = await getDocs(query(usersRef, where('phone', '==', `+91${normalizedPhone.slice(-10)}`)));
    }

    let userId: string;
    let userData: any;

    if (userSnap.empty) {
      return { success: false, error: 'User not found. Please ensure user has signed up first.' };
    }

    const userDoc = userSnap.docs[0];
    userId = userDoc.id;
    userData = userDoc.data();

    // Update user name if provided
    if (name && name.trim()) {
      await updateDoc(doc(db, 'users', userId), {
        name: name.trim(),
        updatedAt: Timestamp.now(),
      });
    }

    // Check if user has active subscription
    const subscriptionsRef = collection(db, 'users', userId, 'subscriptions');
    const activeSubQuery = query(
      subscriptionsRef,
      where('status', '==', 'active'),
      where('isActive', '==', true)
    );
    const activeSubSnap = await getDocs(activeSubQuery);

    const kgPerCredit = planType === 'single' ? 7 : 14;
    const pricePerCredit = 199; // Default price
    const totalAmount = credits * pricePerCredit;
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days

    if (!activeSubSnap.empty) {
      // Update existing subscription
      const existingSub = activeSubSnap.docs[0];
      const existingData = existingSub.data();

      await updateDoc(existingSub.ref, {
        totalCredits: (existingData.totalCredits || 0) + credits,
        creditsRemaining: (existingData.creditsRemaining || 0) + credits,
        totalAmount: (existingData.totalAmount || 0) + totalAmount,
        updatedAt: Timestamp.now(),
      });
    } else {
      // Create new subscription
      const subRef = doc(subscriptionsRef);
      await setDoc(subRef, {
        userId,
        planType,
        totalCredits: credits,
        creditsUsed: 0,
        creditsRemaining: credits,
        currentCreditIndex: 0,
        pricePerCredit,
        totalAmount,
        kgPerCredit,
        status: 'active',
        purchasedAt: Timestamp.now(),
        expiresAt,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error adding credits:', error);
    return { success: false, error: error.message || 'Failed to add credits' };
  }
};

/**
 * Bulk add credits from CSV
 */
export const bulkAddCreditsAdmin = async (
  rows: { name: string; phone: string; planType: string; credits: number }[]
): Promise<{ success: boolean; processed?: number; failed?: number; errors?: string[] }> => {
  const batch = writeBatch(db);
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (const row of rows) {
      try {
        const result = await addCreditsAdmin(
          row.name,
          row.phone,
          row.planType as 'single' | 'couple',
          row.credits
        );

        if (result.success) {
          processed++;
        } else {
          failed++;
          errors.push(`${row.phone}: ${result.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        failed++;
        errors.push(`${row.phone}: ${error.message || 'Unknown error'}`);
      }
    }

    await batch.commit();

    return {
      success: true,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('Error bulk adding credits:', error);
    return {
      success: false,
      processed,
      failed,
      errors: [error.message || 'Bulk operation failed'],
    };
  }
};

/**
 * Check slot availability (Admin)
 */
export const checkSlotAvailabilityAdmin = async (date: string): Promise<string[]> => {
  try {
    const scheduleRef = doc(db, 'daily_schedules', date);
    const scheduleSnap = await getDoc(scheduleRef);
    if (scheduleSnap.exists()) {
      const data = scheduleSnap.data();
      // New format: slot_counts map
      if (data.slot_counts) {
        return Object.entries(data.slot_counts)
          .filter(([_, count]) => (count as number) >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT)
          .map(([slot]) => slot);
      }
      // Legacy fallback
      return [];
    }
    return [];
  } catch (error) {
    console.error('Error checking slot availability (admin):', error);
    return [];
  }
};

/**
 * Schedule delivery for an order (Transaction) (Admin)
 */
export const scheduleOrderDeliveryAdmin = async (
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
      const vendorId = orderData.vendorId || 'vendor_1';
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
    console.error('Error scheduling delivery (admin):', error);
    throw error;
  }
};
