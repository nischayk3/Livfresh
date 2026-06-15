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
  limit,
  startAfter,
  getCountFromServer,
} from './firebase';
import { adminDb as db } from './firebase';
import { generateOTP } from '../utils/otpHelpers';
import { SLOT_CONSTANTS } from '../utils/slotUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Global cache for user profiles to minimize Firestore reads across all admin services
const userCache: Record<string, any> = {};


/**
 * Admin role types for RBAC
 * - super_admin: Full access to all features
 * - store_admin: Limited dashboard, no revenue/stats, AND no customer PII (masked phone, hidden location/whatsapp)
 * - delivery_partner: Limited dashboard, but HAS full access to customer PII for fulfillment
 * - restricted: Legacy role (maps to delivery_partner)
 */
export type AdminRole = 'super_admin' | 'store_admin' | 'delivery_partner' | 'restricted';

/**
 * Get list of admin phone numbers from Firestore config
 * Supports both legacy format ({ "phone": true }) and new role format ({ "phone": { role: "...", name: "..." } })
 */
export const getAdminPhones = async (): Promise<string[]> => {
  try {
    const configRef = doc(db, 'config', 'adminPhones');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      if (data.adminPhones && typeof data.adminPhones === 'object') {
        // Support both old format (value === true) and new format (value === object with role)
        return Object.keys(data.adminPhones).filter(key => {
          const val = data.adminPhones[key];
          return val === true || (typeof val === 'object' && val !== null);
        });
      }
      // Fallback to array format (legacy)
      return data.adminPhones || [];
    }

    // If config doesn't exist, create it with default admin phones in new role format
    const defaultAdminPhones = {
      '9108558715': { role: 'super_admin', name: 'Admin' },
    };
    await setDoc(configRef, {
      adminPhones: defaultAdminPhones,
      updatedAt: Timestamp.now(),
    });

    return Object.keys(defaultAdminPhones);
  } catch (error) {
    console.error('Error getting admin phones:', error);
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
      return AUTHORIZED_ADMINS.includes(cleanPhone);
    }

    const data = configSnap.data();
    const adminPhones = data.adminPhones || {};

    // Check if phone exists in map — support both old (true) and new ({ role }) formats
    if (typeof adminPhones === 'object' && !Array.isArray(adminPhones)) {
      const entry = adminPhones[cleanPhone];
      if (entry === true || (typeof entry === 'object' && entry !== null)) return true;
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
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    return AUTHORIZED_ADMINS.indexOf(cleanPhone) !== -1;
  }
};

/**
 * Get the admin role for a phone number.
 * Returns 'super_admin' for legacy entries (value === true) and hardcoded admins.
 * Returns the stored role for new format entries.
 */
export const getAdminRole = async (phone: string): Promise<{ role: AdminRole; name: string }> => {
  const AUTHORIZED_ADMINS = ['9661802634', '9852030638', '9108558715'];
  const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

  try {
    const configRef = doc(db, 'config', 'adminPhones');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      const adminPhones = data.adminPhones || {};

      if (typeof adminPhones === 'object' && !Array.isArray(adminPhones)) {
        const entry = adminPhones[cleanPhone];

        // New format: { role: 'store_admin' | 'delivery_partner', name: 'Ramesh' }
        if (typeof entry === 'object' && entry !== null && entry.role) {
          // Map legacy 'restricted' to 'delivery_partner' to maintain their access
          const mappedRole = entry.role === 'restricted' ? 'delivery_partner' : entry.role;
          return {
            role: mappedRole as AdminRole,
            name: entry.name || 'Admin',
          };
        }

        // Old format: true — treat as super_admin
        if (entry === true) {
          return { role: 'super_admin', name: 'Admin' };
        }
      }
    }

    // Hardcoded admins are always super_admin
    if (AUTHORIZED_ADMINS.includes(cleanPhone)) {
      return { role: 'super_admin', name: 'Admin' };
    }

    // Default fallback (shouldn't reach here if isAdminPhone was checked first)
    return { role: 'delivery_partner', name: 'Unknown' };
  } catch (error) {
    console.error('Error getting admin role:', error);
    // Hardcoded admins are always super_admin
    if (AUTHORIZED_ADMINS.includes(cleanPhone)) {
      return { role: 'super_admin', name: 'Admin' };
    }
    return { role: 'delivery_partner', name: 'Unknown' };
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
    // 1. Get total users count efficiently using getCountFromServer (0 document reads)
    const usersRef = collection(db, 'users');
    const totalUsersSnap = await getCountFromServer(usersRef);
    const totalUsers = totalUsersSnap.data().count;

    let activeUsers = 0;

    // 2. Query orders from the last 90 days to find active users (fewer documents to download)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoTimestamp = Timestamp.fromDate(ninetyDaysAgo);

    let ordersSnap;
    try {
      const q = query(
        collectionGroup(db, 'orders'),
        where('createdAt', '>=', ninetyDaysAgoTimestamp)
      );
      ordersSnap = await getDocs(q);
      console.log(`[UserStats] Successfully queried recent orders. Count: ${ordersSnap.size}`);
    } catch (e) {
      console.warn('[UserStats] Missing index or query failed. Falling back to all orders.', e);
      const ordersQuery = query(collectionGroup(db, 'orders'));
      ordersSnap = await getDocs(ordersQuery);
    }

    const activeUserIds = new Set();
    ordersSnap.docs.forEach(doc => {
      const order = doc.data();
      if (order.status && order.status !== 'cancelled') {
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

    // Attempt range query to get only today's orders
    let ordersSnap;
    try {
      const q = query(
        collectionGroup(db, 'orders'),
        where('createdAt', '>=', todayStart),
        where('createdAt', '<', todayEnd)
      );
      ordersSnap = await getDocs(q);
      console.log(`[Stats] Successfully queried today's orders. Count: ${ordersSnap.size}`);
    } catch (e) {
      console.warn('[Stats] Missing index for today\'s orders collectionGroup query. Falling back to loading all orders.', e);
      const ordersQuery = query(collectionGroup(db, 'orders'));
      ordersSnap = await getDocs(ordersQuery);
    }

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
            } else {
              // Cache a placeholder for missing/deleted users
              userCache[userId] = { name: 'Deleted User', phone: '' };
              userName = 'Deleted User';
              userPhone = '';
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
 * Enrich a list of order documents with user name and phone number if missing.
 * Uses a memory cache to minimize Firestore reads.
 */
export const enrichOrders = async (docs: any[]): Promise<any[]> => {
  const enrichedOrders: any[] = [];

  for (const docObj of docs) {
    const orderData = docObj.data ? docObj.data() : docObj;
    const docId = docObj.id || orderData.id;
    
    // Robust userId extraction
    let userId = orderData.userId;
    if (!userId && docObj.ref && docObj.ref.parent && docObj.ref.parent.parent) {
      userId = docObj.ref.parent.parent.id;
    }

    let userName = orderData.customerName || orderData.userName || 'Unknown';
    let userPhone = orderData.customerPhone || orderData.userPhone || '';

    // If user details are missing, fetch from user doc
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
          } else {
            // Cache a placeholder for missing/deleted users to prevent redundant getDoc calls
            userCache[userId] = { name: 'Deleted User', phone: '' };
            userName = 'Deleted User';
            userPhone = '';
          }
        } catch (e) {
          console.warn(`[Admin] Enrichment failed for user ${userId} in order ${docId}`);
        }
      }
    }

    enrichedOrders.push({
      ...orderData,
      id: docId,
      userId: userId,
      customerName: userName,
      customerPhone: userPhone,
      address: orderData.address || orderData.deliveryAddress || null,
    });
  }

  return enrichedOrders;
};

/**
 * Fallback cache and fetcher for when collectionGroup indices are missing on status.
 * This loads all orders in memory once, then queries them client-side.
 */
/**
 * Fallback cache and fetcher for when collectionGroup indices are missing on status.
 * This loads all orders in memory once, then queries them client-side.
 */
let fallbackOrdersCache: any[] | null = null;
let isStatusIndexAvailable = true;
let isIndexCheckDone = false;
let indexCheckPromise: Promise<boolean> | null = null;
const INDEX_CHECK_STORAGE_KEY = '@admin_is_status_index_available_v2';

export const checkStatusIndex = async (): Promise<boolean> => {
  if (isIndexCheckDone) return isStatusIndexAvailable;
  if (indexCheckPromise) return indexCheckPromise;

  indexCheckPromise = (async () => {
    try {
      // 1. Try reading from AsyncStorage first to avoid network probe call entirely
      const cachedValue = await AsyncStorage.getItem(INDEX_CHECK_STORAGE_KEY);
      if (cachedValue !== null) {
        isStatusIndexAvailable = cachedValue === 'true';
        isIndexCheckDone = true;
        console.log(`[Admin] Cached status index availability: ${isStatusIndexAvailable}`);
        return isStatusIndexAvailable;
      }

      console.log('[Admin] No cached status index state. Probing status collectionGroup index availability...');
      // 2. Run a tiny query with limit(1) to test if status index is available
      const q = query(collectionGroup(db, 'orders'), where('status', '==', 'placed'), limit(1));
      await getDocs(q);
      isStatusIndexAvailable = true;
      console.log('[Admin] Status collectionGroup index is AVAILABLE.');
      await AsyncStorage.setItem(INDEX_CHECK_STORAGE_KEY, 'true');
    } catch (error: any) {
      const errStr = String(error).toLowerCase();
      if (
        error.code === 'failed-precondition' ||
        errStr.includes('index') ||
        errStr.includes('400') ||
        errStr.includes('precondition')
      ) {
        console.warn('[Admin] Status collectionGroup index is NOT available. Falling back to client-side logic.', error.message);
        isStatusIndexAvailable = false;
        await AsyncStorage.setItem(INDEX_CHECK_STORAGE_KEY, 'false');
      } else {
        console.error('[Admin] Index probe failed with non-index error:', error);
        // Do not cache as false for generic/network errors so we retry
        isStatusIndexAvailable = true;
      }
    }
    isIndexCheckDone = true;
    indexCheckPromise = null;
    return isStatusIndexAvailable;
  })();

  return indexCheckPromise;
};

export const clearFallbackOrdersCache = async () => {
  fallbackOrdersCache = null;
  isStatusIndexAvailable = true; // Retry index queries on manual pull-to-refresh
  isIndexCheckDone = false;
  try {
    await AsyncStorage.removeItem(INDEX_CHECK_STORAGE_KEY);
    console.log('[Admin] Cleared status index availability cache from AsyncStorage.');
  } catch (error) {
    console.error('[Admin] Failed to clear status index cache from AsyncStorage:', error);
  }
};

export const getAllOrdersFallback = async (): Promise<any[]> => {
  if (fallbackOrdersCache) return fallbackOrdersCache;

  try {
    console.log('[Admin] Fallback: Fetching all orders via collectionGroup...');
    const q = query(collectionGroup(db, 'orders'));
    const snapshot = await getDocs(q);

    const uniqueDocsMap = new Map();
    snapshot.docs.forEach(doc => {
      if (!uniqueDocsMap.has(doc.id)) {
        uniqueDocsMap.set(doc.id, doc);
      }
    });

    const docs = Array.from(uniqueDocsMap.values());
    const enriched = await enrichOrders(docs);

    // Client-side sorting: Newest first
    enriched.sort((a, b) => {
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

    fallbackOrdersCache = enriched;
    return enriched;
  } catch (error) {
    console.error('[Admin] Fallback fetch failed:', error);
    return [];
  }
};

/**
 * Subscribe to active orders (placed, confirmed, pickup_completed, processing, ready, out_for_delivery)
 * in real-time. If it fails due to missing index, automatically falls back to all orders subscription.
 */
export const subscribeToActiveOrdersAdmin = (callback: (orders: any[]) => void) => {
  let unsubscribeActive: (() => void) | null = null;
  let unsubscribeAll: (() => void) | null = null;
  let active = true;

  const setupActiveListener = async () => {
    const isAvailable = await checkStatusIndex();
    if (!isAvailable) {
      setupAllListener();
      return;
    }

    if (!active) return;

    console.log('[Admin] Subscribing to active orders via collectionGroup...');
    const q = query(
      collectionGroup(db, 'orders'),
      where('status', 'in', ['placed', 'confirmed', 'pickup_completed', 'processing', 'ready', 'out_for_delivery'])
    );

    unsubscribeActive = onSnapshot(q, async (snapshot) => {
      const uniqueDocsMap = new Map();
      snapshot.docs.forEach(doc => {
        if (!uniqueDocsMap.has(doc.id)) {
          uniqueDocsMap.set(doc.id, doc);
        }
      });

      const activeDocs = Array.from(uniqueDocsMap.values());
      const enriched = await enrichOrders(activeDocs);

      // Client-side sorting: Newest first
      enriched.sort((a, b) => {
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

      if (active) callback(enriched);
    }, async (error: any) => {
      console.warn('[Admin] subscribeToActiveOrdersAdmin failed. Falling back to subscribeToAllOrdersAdmin.', error.message);
      isStatusIndexAvailable = false; // Disable status-filtered queries to prevent 400s
      try {
        await AsyncStorage.setItem(INDEX_CHECK_STORAGE_KEY, 'false');
      } catch (e) {}
      if (active) {
        setupAllListener();
      }
    });
  };

  const setupAllListener = () => {
    console.log('[Admin] Fallback: Subscribing to ALL orders via collectionGroup...');
    const q = query(collectionGroup(db, 'orders'));

    unsubscribeAll = onSnapshot(q, async (snapshot) => {
      const uniqueDocsMap = new Map();
      snapshot.docs.forEach(doc => {
        if (!uniqueDocsMap.has(doc.id)) {
          uniqueDocsMap.set(doc.id, doc);
        }
      });

      const allDocs = Array.from(uniqueDocsMap.values());
      const enriched = await enrichOrders(allDocs);

      // Filter to active statuses in memory
      const activeStatuses = ['placed', 'confirmed', 'pickup_completed', 'processing', 'ready', 'out_for_delivery'];
      const activeOrders = enriched.filter(order => activeStatuses.includes(order.status));

      // Client-side sorting: Newest first
      activeOrders.sort((a, b) => {
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

      if (active) callback(activeOrders);
    }, (error) => {
      console.error('[Admin] Fallback subscriber failed:', error);
    });
  };

  setupActiveListener();

  return () => {
    active = false;
    if (unsubscribeActive) unsubscribeActive();
    if (unsubscribeAll) unsubscribeAll();
  };
};

/**
 * Fetch orders for a specific status with pagination support.
 * Useful for archived tabs (delivered, cancelled) to prevent fetching all data.
 * Falls back to in-memory pagination if collection group index fails.
 */
export const fetchOrdersByStatusPaginated = async (
  status: string,
  pageSize: number = 20,
  lastVisibleDoc: any = null
): Promise<{ orders: any[]; lastVisible: any; hasMore: boolean }> => {
  const isAvailable = await checkStatusIndex();
  if (!isAvailable) {
    return await fetchOrdersByStatusPaginatedFallback(status, pageSize, lastVisibleDoc);
  }

  try {
    console.log(`[Admin] Fetching paginated orders for status: ${status}, limit: ${pageSize}`);
    
    let baseQuery;
    if (status === 'confirmed') {
      baseQuery = query(
        collectionGroup(db, 'orders'),
        where('status', 'in', ['placed', 'confirmed'])
      );
    } else {
      baseQuery = query(
        collectionGroup(db, 'orders'),
        where('status', '==', status)
      );
    }

    // Try ordered query (requires composite index)
    let orderedQuery = query(baseQuery, orderBy('createdAt', 'desc'), limit(pageSize));
    if (lastVisibleDoc) {
      orderedQuery = query(orderedQuery, startAfter(lastVisibleDoc));
    }

    let snapshot;
    let fallbackUsed = false;
    
    try {
      snapshot = await getDocs(orderedQuery);
    } catch (indexError: any) {
      if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
        console.warn(`[Admin] Firestore index not found for status ${status}. Falling back to unordered query. Link: ${indexError.message}`);
        
        let fallbackQuery = query(baseQuery, limit(pageSize));
        if (lastVisibleDoc) {
          fallbackQuery = query(fallbackQuery, startAfter(lastVisibleDoc));
        }
        snapshot = await getDocs(fallbackQuery);
        fallbackUsed = true;
      } else {
        throw indexError;
      }
    }

    if (snapshot.empty) {
      return { orders: [], lastVisible: null, hasMore: false };
    }

    // Deduplicate docs immediately
    const uniqueDocsMap = new Map();
    snapshot.docs.forEach(doc => {
      if (!uniqueDocsMap.has(doc.id)) {
        uniqueDocsMap.set(doc.id, doc);
      }
    });

    const docsList = Array.from(uniqueDocsMap.values());
    const enriched = await enrichOrders(docsList);

    // If fallback query was used, sort page results client-side by date
    if (fallbackUsed) {
      enriched.sort((a, b) => {
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
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === pageSize;

    return {
      orders: enriched,
      lastVisible: lastDoc,
      hasMore,
    };
  } catch (error: any) {
    const errStr = String(error).toLowerCase();
    if (error.code === 'failed-precondition' || errStr.includes('index') || errStr.includes('400') || errStr.includes('precondition')) {
      console.warn('[Admin] fetchOrdersByStatusPaginated failed because status index is missing. Disabling index queries.');
      isStatusIndexAvailable = false;
      try {
        await AsyncStorage.setItem(INDEX_CHECK_STORAGE_KEY, 'false');
      } catch (e) {}
    }
    return await fetchOrdersByStatusPaginatedFallback(status, pageSize, lastVisibleDoc);
  }
};

const fetchOrdersByStatusPaginatedFallback = async (
  status: string,
  pageSize: number = 20,
  lastVisibleDoc: any = null
): Promise<{ orders: any[]; lastVisible: any; hasMore: boolean }> => {
  // In-memory fallback pagination
  const allOrders = await getAllOrdersFallback();
  
  let filtered;
  if (status === 'confirmed') {
    filtered = allOrders.filter(o => o.status === 'confirmed' || o.status === 'placed');
  } else {
    filtered = allOrders.filter(o => o.status === status);
  }

  let startIndex = 0;
  if (lastVisibleDoc) {
    const index = filtered.findIndex(o => o.id === lastVisibleDoc.id);
    if (index !== -1) {
      startIndex = index + 1;
    }
  }

  const pageOrders = filtered.slice(startIndex, startIndex + pageSize);
  const lastDoc = pageOrders.length > 0 ? pageOrders[pageOrders.length - 1] : null;
  const hasMore = startIndex + pageSize < filtered.length;

  return {
    orders: pageOrders,
    lastVisible: lastDoc,
    hasMore
  };
};

/**
 * Fetch total counts for all statuses from the server.
 * Falls back to in-memory counting if index is missing.
 */
export const getOrderStatusCounts = async (): Promise<Record<string, number>> => {
  const isAvailable = await checkStatusIndex();
  if (!isAvailable) {
    return await getOrderStatusCountsFallback();
  }

  try {
    const statuses = ['placed', 'confirmed', 'pickup_completed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    const counts: Record<string, number> = {};
    
    await Promise.all(statuses.map(async (status) => {
      let q;
      if (status === 'confirmed') {
        q = query(collectionGroup(db, 'orders'), where('status', 'in', ['placed', 'confirmed']));
      } else if (status === 'placed') {
        return;
      } else {
        q = query(collectionGroup(db, 'orders'), where('status', '==', status));
      }
      const snap = await getCountFromServer(q);
      counts[status] = snap.data().count;
    }));

    return {
      confirmed: counts['confirmed'] || 0,
      pickup_completed: counts['pickup_completed'] || 0,
      processing: counts['processing'] || 0,
      ready: counts['ready'] || 0,
      out_for_delivery: counts['out_for_delivery'] || 0,
      delivered: counts['delivered'] || 0,
      cancelled: counts['cancelled'] || 0,
    };
  } catch (error: any) {
    const errStr = String(error).toLowerCase();
    if (error.code === 'failed-precondition' || errStr.includes('index') || errStr.includes('400') || errStr.includes('precondition')) {
      console.warn('[Admin] getOrderStatusCounts failed because status index is missing. Disabling index queries.');
      isStatusIndexAvailable = false;
      try {
        await AsyncStorage.setItem(INDEX_CHECK_STORAGE_KEY, 'false');
      } catch (e) {}
    }
    return await getOrderStatusCountsFallback();
  }
};

const getOrderStatusCountsFallback = async (): Promise<Record<string, number>> => {
  const allOrders = await getAllOrdersFallback();
  const counts: Record<string, number> = {
    confirmed: 0,
    pickup_completed: 0,
    processing: 0,
    ready: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };

  allOrders.forEach(order => {
    const status = order.status || 'placed';
    if (status === 'placed' || status === 'confirmed') {
      counts.confirmed++;
    } else if (counts[status] !== undefined) {
      counts[status]++;
    }
  });

  return counts;
};

/**
 * Search all orders on the server by phone, name, ID, or token.
 * Falls back to in-memory filter if index is missing.
 */
export const searchOrdersAdmin = async (queryText: string): Promise<any[]> => {
  const isAvailable = await checkStatusIndex();
  if (!isAvailable) {
    return await searchOrdersAdminFallback(queryText);
  }

  if (!queryText) return [];
  const cleanQuery = queryText.trim();
  
  try {
    // Queries to run in parallel
    const queries = [
      query(collectionGroup(db, 'orders'), where('userPhone', '==', cleanQuery)),
      query(collectionGroup(db, 'orders'), where('customerPhone', '==', cleanQuery)),
      query(collectionGroup(db, 'orders'), where('userName', '==', cleanQuery)),
      query(collectionGroup(db, 'orders'), where('customerName', '==', cleanQuery)),
      query(collectionGroup(db, 'orders'), where('id', '==', cleanQuery)),
      query(collectionGroup(db, 'orders'), where('tokenNumber', '==', cleanQuery)),
      query(collectionGroup(db, 'orders'), where('pickupOTP', '==', cleanQuery)),
    ];
    
    const snaps = await Promise.all(queries.map(q => getDocs(q)));
    const allDocs: any[] = [];
    const seen = new Set<string>();
    
    snaps.forEach(snap => {
      snap.docs.forEach(docSnap => {
        if (!seen.has(docSnap.id)) {
          seen.add(docSnap.id);
          allDocs.push(docSnap);
        }
      });
    });
    
    return await enrichOrders(allDocs);
  } catch (error: any) {
    const errStr = String(error).toLowerCase();
    if (error.code === 'failed-precondition' || errStr.includes('index') || errStr.includes('400') || errStr.includes('precondition')) {
      console.warn('[Admin] searchOrdersAdmin failed because status index is missing. Disabling index queries.');
      isStatusIndexAvailable = false;
      try {
        await AsyncStorage.setItem(INDEX_CHECK_STORAGE_KEY, 'false');
      } catch (e) {}
    }
    return await searchOrdersAdminFallback(queryText);
  }
};

const searchOrdersAdminFallback = async (queryText: string): Promise<any[]> => {
  if (!queryText) return [];
  const cleanQuery = queryText.trim();
  const lowerQuery = cleanQuery.toLowerCase();
  
  const allOrders = await getAllOrdersFallback();
  return allOrders.filter(order =>
    order.id.toLowerCase().includes(lowerQuery) ||
    (order.customerPhone || '').includes(cleanQuery) ||
    (order.customerName || '').toLowerCase().includes(lowerQuery) ||
    (order.pickupOTP || '').includes(cleanQuery) ||
    (order.tokenNumber || '').includes(cleanQuery)
  );
};

/**
 * Subscribe to all orders from all users in real-time (for admin)
 * Includes data enrichment for customer name/phone
 */
export const subscribeToAllOrdersAdmin = (callback: (orders: any[]) => void) => {
  console.log('[Admin] Subscribing to all orders via collectionGroup...');
  const ordersQuery = query(collectionGroup(db, 'orders'));

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
            } else {
              // Cache placeholder for deleted/missing user
              userCache[userId] = { name: 'Deleted User', phone: '' };
              userName = 'Deleted User';
              userPhone = '';
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
    let ordersSnap;
    try {
      const ordersQuery = query(
        collectionGroup(db, 'orders'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      );
      ordersSnap = await getDocs(ordersQuery);
      console.log(`[Revenue] Range query success. Fetched ${ordersSnap.size} orders within range.`);
    } catch (e) {
      console.warn('[Revenue] Missing index for collectionGroup orders date filter. Falling back to full query.', e);
      const ordersQuery = query(collectionGroup(db, 'orders'));
      ordersSnap = await getDocs(ordersQuery);
    }

    const seenOrderIds = new Set<string>();

    // Mapping for frequency calculation
    const userToOrders: Record<string, any[]> = {};

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

    // Second pass: Filter orders in range (already filtered if index succeeded, but safe to filter again) and enrich
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

        // Fetch user profile if not cached (using unified global cache)
        if (userId && !userCache[userId]) {
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists()) {
              userCache[userId] = userSnap.data();
            } else {
              userCache[userId] = { name: 'Deleted User', phone: '' };
            }
          } catch (e) {
            console.warn(`[Revenue] Failed to fetch user ${userId}`);
          }
        }

        const user = userCache[userId] || {};
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
    let subsSnap;
    try {
      const subsQuery = query(
        collectionGroup(db, 'subscriptions'),
        where('purchasedAt', '>=', start),
        where('purchasedAt', '<=', end)
      );
      subsSnap = await getDocs(subsQuery);
      console.log(`[Revenue] Subscriptions range query success. Fetched ${subsSnap.size} subscriptions.`);
    } catch (e) {
      console.warn('[Revenue] Missing index for collectionGroup subscriptions range query. Falling back to full query.', e);
      const subsQuery = query(collectionGroup(db, 'subscriptions'));
      subsSnap = await getDocs(subsQuery);
    }

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
 * Schedule delivery for an order (Transaction) (Admin) - Releases old slot if rescheduling
 */
export const scheduleOrderDeliveryAdmin = async (
  userId: string,
  orderId: string,
  deliveryDate: string,
  deliveryTime: string
): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
      const userOrderSnap = await transaction.get(userOrderRef);

      if (!userOrderSnap.exists()) {
        throw new Error('Order not found');
      }

      const orderData = userOrderSnap.data();
      const oldDeliveryDate = orderData.deliveryDate;
      const oldDeliveryTime = orderData.deliveryTime;

      // If exactly the same slot, no need to do anything
      if (oldDeliveryDate === deliveryDate && oldDeliveryTime === deliveryTime) {
        return;
      }

      // Handle Slot Changes
      if (oldDeliveryDate === deliveryDate) {
        // Same Date, Different Slot
        const scheduleRef = doc(db, 'daily_schedules', deliveryDate);
        const scheduleSnap = await transaction.get(scheduleRef);
        const slotCounts = scheduleSnap.exists() ? (scheduleSnap.data().slot_counts || {}) : {};

        // Release old
        if (oldDeliveryTime) {
          slotCounts[oldDeliveryTime] = Math.max(0, (slotCounts[oldDeliveryTime] || 0) - 1);
        }

        // Reserve new
        const currentCount = slotCounts[deliveryTime] || 0;
        if (currentCount >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT) {
          throw new Error(`Slot ${deliveryTime} is no longer available.`);
        }
        slotCounts[deliveryTime] = currentCount + 1;

        transaction.set(scheduleRef, { slot_counts: slotCounts }, { merge: true });
      } else {
        // Different Dates
        // 1. Decrement old slot count
        if (oldDeliveryDate && oldDeliveryTime) {
          const oldScheduleRef = doc(db, 'daily_schedules', oldDeliveryDate);
          const oldScheduleSnap = await transaction.get(oldScheduleRef);
          if (oldScheduleSnap.exists()) {
            const oldSlotCounts = oldScheduleSnap.data().slot_counts || {};
            const oldCount = oldSlotCounts[oldDeliveryTime] || 0;
            transaction.set(oldScheduleRef, {
              slot_counts: {
                ...oldSlotCounts,
                [oldDeliveryTime]: Math.max(0, oldCount - 1)
              }
            }, { merge: true });
          }
        }

        // 2. Increment new slot count
        const scheduleRef = doc(db, 'daily_schedules', deliveryDate);
        const scheduleSnap = await transaction.get(scheduleRef);
        const slotCounts = scheduleSnap.exists() ? (scheduleSnap.data().slot_counts || {}) : {};
        const currentCount = slotCounts[deliveryTime] || 0;

        if (currentCount >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT) {
          throw new Error(`Slot ${deliveryTime} is no longer available.`);
        }

        transaction.set(scheduleRef, {
          slot_counts: { ...slotCounts, [deliveryTime]: currentCount + 1 }
        }, { merge: true });
      }

      const timestamp = Timestamp.now();
      const updateData = {
        deliveryDate,
        deliveryTime,
        deliveryScheduledAt: timestamp,
        updatedAt: timestamp,
      };

      // Perform Writes
      transaction.update(userOrderRef, updateData);

      const vendorId = orderData.vendorId || 'vendor_1';
      const vendorOrderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
      transaction.update(vendorOrderRef, updateData);
    });

    return true;
  } catch (error) {
    console.error('Error scheduling delivery (admin):', error);
    throw error;
  }
};

/**
 * Reschedule pickup for an order (Transaction) (Admin) - Releases old slot
 */
export const rescheduleOrderPickupAdmin = async (
  userId: string,
  orderId: string,
  pickupDate: string,
  pickupTime: string
): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
      const userOrderSnap = await transaction.get(userOrderRef);

      if (!userOrderSnap.exists()) {
        throw new Error('Order not found');
      }

      const orderData = userOrderSnap.data();
      const oldPickupDate = orderData.pickupDetails?.scheduledDate;
      const oldPickupTime = orderData.pickupDetails?.scheduledTime;

      // If exactly the same slot, no-op
      if (oldPickupDate === pickupDate && oldPickupTime === pickupTime) {
        return;
      }

      // Handle Slot Changes
      if (oldPickupDate === pickupDate) {
        // Same Date, Different Slot
        const scheduleRef = doc(db, 'daily_schedules', pickupDate);
        const scheduleSnap = await transaction.get(scheduleRef);
        const slotCounts = scheduleSnap.exists() ? (scheduleSnap.data().slot_counts || {}) : {};

        // Release old
        if (oldPickupTime) {
          slotCounts[oldPickupTime] = Math.max(0, (slotCounts[oldPickupTime] || 0) - 1);
        }

        // Reserve new
        const currentCount = slotCounts[pickupTime] || 0;
        if (currentCount >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT) {
          throw new Error(`Slot ${pickupTime} is no longer available.`);
        }
        slotCounts[pickupTime] = currentCount + 1;

        transaction.set(scheduleRef, { slot_counts: slotCounts }, { merge: true });
      } else {
        // Different Dates
        // 1. Decrement old slot count
        if (oldPickupDate && oldPickupTime) {
          const oldScheduleRef = doc(db, 'daily_schedules', oldPickupDate);
          const oldScheduleSnap = await transaction.get(oldScheduleRef);
          if (oldScheduleSnap.exists()) {
            const oldSlotCounts = oldScheduleSnap.data().slot_counts || {};
            const oldCount = oldSlotCounts[oldPickupTime] || 0;
            transaction.set(oldScheduleRef, {
              slot_counts: {
                ...oldSlotCounts,
                [oldPickupTime]: Math.max(0, oldCount - 1)
              }
            }, { merge: true });
          }
        }

        // 2. Increment new slot count
        const scheduleRef = doc(db, 'daily_schedules', pickupDate);
        const scheduleSnap = await transaction.get(scheduleRef);
        const slotCounts = scheduleSnap.exists() ? (scheduleSnap.data().slot_counts || {}) : {};
        const currentCount = slotCounts[pickupTime] || 0;

        if (currentCount >= SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT) {
          throw new Error(`Slot ${pickupTime} is no longer available.`);
        }

        transaction.set(scheduleRef, {
          slot_counts: { ...slotCounts, [pickupTime]: currentCount + 1 }
        }, { merge: true });
      }

      const timestamp = Timestamp.now();
      const newPickupDetails = {
        ...(orderData.pickupDetails || {}),
        type: 'scheduled',
        scheduledDate: pickupDate,
        scheduledTime: pickupTime,
      };

      const updateData = {
        pickupDetails: newPickupDetails,
        updatedAt: timestamp,
      };

      // Perform Writes
      transaction.update(userOrderRef, updateData);

      const vendorId = orderData.vendorId || 'vendor_1';
      const vendorOrderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
      transaction.update(vendorOrderRef, updateData);
    });

    return true;
  } catch (error) {
    console.error('Error rescheduling pickup (admin):', error);
    throw error;
  }
};

/**
 * Update the inner processing step of an order (Admin)
 */
export const updateOrderProcessingStepAdmin = async (
  userId: string,
  orderId: string,
  nextStep: string
): Promise<boolean> => {
  try {
    const timestamp = Timestamp.now();
    const updateData = {
      processingStep: nextStep,
      updatedAt: timestamp
    };

    const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
    await updateDoc(userOrderRef, updateData);

    const orderSnap = await getDoc(userOrderRef);
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const vendorId = orderData.vendorId || 'vendor_1';
      const vendorOrderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
      await updateDoc(vendorOrderRef, updateData);
    }

    return true;
  } catch (error) {
    console.error('Error updating order processing step:', error);
    throw error;
  }
};

/**
 * Upload order ready proof (photo or video) to Storage (Admin)
 */
export const uploadOrderReadyProofAdmin = async (
  uri: string,
  orderId: string,
  isVideo: boolean = false
): Promise<string> => {
  try {
    const storage = getStorage();
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = isVideo ? 'mp4' : 'jpg';
    const storageRef = ref(storage, `ready_proofs/${orderId}/proof_${Date.now()}.${extension}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading ready proof:', error);
    throw new Error('Failed to upload proof to storage');
  }
};
