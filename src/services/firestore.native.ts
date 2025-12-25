import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Get vendor data
export const getVendor = async (vendorId: string) => {
    const vendorRef = firestore().collection('vendors').doc(vendorId);
    const vendorSnap: FirebaseFirestoreTypes.DocumentSnapshot = await vendorRef.get();
    if (vendorSnap.exists()) {
        return { id: vendorSnap.id, ...vendorSnap.data() };
    }
    return null;
};

// Get user profile
export const getUser = async (userId: string) => {
    try {
        const userRef = firestore().collection('users').doc(userId);
        const userSnap = await userRef.get();
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
        const vendorsSnap = await firestore()
            .collection('vendors')
            .where('active', '==', true)
            .orderBy('rating', 'desc')
            .get();

        return vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
        console.error('Error getting vendors:', error);
        throw error;
    }
};

// Get vendors by area
export const getVendorsByArea = async (area: string) => {
    try {
        const vendorsSnap = await firestore()
            .collection('vendors')
            .where('active', '==', true)
            .where('area', '==', area)
            .orderBy('rating', 'desc')
            .get();

        return vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
        console.error('Error getting vendors by area:', error);
        throw error;
    }
};

// Get vendor services
export const getVendorServices = async (vendorId: string) => {
    const servicesSnap = await firestore()
        .collection('vendors')
        .doc(vendorId)
        .collection('services')
        .get();
    return servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Check if user exists by phone number
export const checkUserExists = async (phone: string) => {
    try {
        const querySnapshot = await firestore()
            .collection('users')
            .where('phone', '==', phone)
            .get();

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
        await firestore().collection('users').doc(userId).set({
            phone,
            name,
            email: email || '',
            gender: gender || '',
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ User created: ${userId}`);
    } catch (error: any) {
        console.error('Error creating user:', error);
        if (error.code === 'firestore/permission-denied') {
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
        await firestore().collection('users').doc(userId).update({
            ...data,
            updatedAt: firestore.FieldValue.serverTimestamp(),
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
        const userRef = firestore().collection('users').doc(userId);
        const userSnap: FirebaseFirestoreTypes.DocumentSnapshot = await userRef.get();
        let currentAddresses: any[] = [];

        if (userSnap.exists()) {
            currentAddresses = userSnap.data()?.savedAddresses || [];
        }

        const newAddress = {
            id: Date.now().toString(),
            label,
            address,
            latitude,
            longitude,
            isPrimary,
            createdAt: firestore.Timestamp.now(),
        };

        // If new address is primary, unset others
        if (isPrimary) {
            currentAddresses = currentAddresses.map(addr => ({ ...addr, isPrimary: false }));
        }

        const updatedAddresses = [...currentAddresses, newAddress];

        await userRef.update({
            savedAddresses: updatedAddresses,
            updatedAt: firestore.FieldValue.serverTimestamp(),
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
        const userSnap: FirebaseFirestoreTypes.DocumentSnapshot = await firestore().collection('users').doc(userId).get();

        if (userSnap.exists()) {
            const addresses = userSnap.data()?.savedAddresses || [];
            return addresses.reverse();
        }
        return [];
    } catch (error: any) {
        console.error('Error getting addresses:', error);
        throw error;
    }
};

// Update address
export const updateUserAddress = async (userId: string, updatedAddress: any) => {
    try {
        const userRef = firestore().collection('users').doc(userId);
        const userSnap: FirebaseFirestoreTypes.DocumentSnapshot = await userRef.get();

        if (userSnap.exists()) {
            let addresses = userSnap.data()?.savedAddresses || [];

            if (updatedAddress.isPrimary) {
                addresses = addresses.map((addr: any) => ({ ...addr, isPrimary: false }));
            }

            const newAddresses = addresses.map((addr: any) =>
                addr.id === updatedAddress.id ? { ...updatedAddress, updatedAt: firestore.Timestamp.now() } : addr
            );

            await userRef.update({
                savedAddresses: newAddresses,
                updatedAt: firestore.FieldValue.serverTimestamp(),
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
        const ordersRef = firestore().collection('users').doc(userId).collection('orders');
        const orderDoc = ordersRef.doc(); // Auto ID
        const orderId = orderDoc.id;

        const orderWithTimestamp = {
            ...orderData,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        const cleanOrder = cleanData(orderWithTimestamp);

        // Save to user orders
        await orderDoc.set(cleanOrder);

        // Mirror to vendor orders
        await firestore()
            .collection('vendors')
            .doc(orderData.vendorId)
            .collection('orders')
            .doc(orderId)
            .set({
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
        const ordersSnap = await firestore()
            .collection('users')
            .doc(userId)
            .collection('orders')
            .orderBy('createdAt', 'desc')
            .get();

        return ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
        console.error('Error getting orders:', error);
        throw error;
    }
};

// Get single order
export const getOrder = async (userId: string, orderId: string) => {
    try {
        const orderSnap: FirebaseFirestoreTypes.DocumentSnapshot = await firestore()
            .collection('users')
            .doc(userId)
            .collection('orders')
            .doc(orderId)
            .get();

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
        const vendorId = 'vendor_1'; // Hardcoded as per original
        const timestamp = firestore.FieldValue.serverTimestamp();

        // Update user order
        await firestore()
            .collection('users')
            .doc(userId)
            .collection('orders')
            .doc(orderId)
            .update({
                status,
                updatedAt: timestamp,
            });

        // Update vendor order
        await firestore()
            .collection('vendors')
            .doc(vendorId)
            .collection('orders')
            .doc(orderId)
            .update({
                status,
                updatedAt: timestamp,
            });
    } catch (error: any) {
        console.error('Error updating order status:', error);
        throw error;
    }
};

// Helper: Clean Data
const cleanData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;

    if (Array.isArray(data)) {
        return data
            .map(cleanData)
            .filter((item) => item !== undefined && item !== null);
    } else if (typeof data === 'object') {
        // Check for special Firestore types if necessary, though native SDK handles most
        // Date/Timestamp pass-through check
        if (data.constructor && data.constructor.name === 'Timestamp') return data;
        if (data instanceof Date) return data;

        return Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                const cleaned = cleanData(value);
                if (cleaned !== undefined) {
                    acc[key] = cleaned;
                }
            }
            return acc;
        }, {} as any);
    }
    return data;
};

// Save cart
export const saveCart = async (userId: string, cartItems: any[]) => {
    try {
        const userRef = firestore().collection('users').doc(userId);
        const cleanItems = cleanData(cartItems);

        await userRef.set({
            activeCart: cleanItems,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (error: any) {
        console.error('Error saving cart:', error);
        throw error;
    }
};

// Get cart
export const getCart = async (userId: string) => {
    try {
        const userSnap: FirebaseFirestoreTypes.DocumentSnapshot = await firestore().collection('users').doc(userId).get();
        if (userSnap.exists()) {
            return userSnap.data()?.activeCart || [];
        }
        return [];
    } catch (error: any) {
        console.error('Error getting cart:', error);
        throw error;
    }
};

// Clear cart
export const clearCartInFirestore = async (userId: string) => {
    try {
        await firestore().collection('users').doc(userId).update({
            activeCart: [],
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error: any) {
        console.error('Error clearing cart in Firestore:', error);
        throw error;
    }
};

// --- Subscription Management ---

/**
 * Creates a new subscription for a user (Native)
 * @param userId - Firebase Auth UID
 * @param data - Subscription details
 */
export async function createSubscription(userId: string, data: any) {
    try {
        const subscriptionsRef = firestore().collection('users').doc(userId).collection('subscriptions');
        const subDoc = subscriptionsRef.doc();
        const subId = subDoc.id;

        const subscriptionWithTimestamp = {
            ...data,
            status: 'active',
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            startDate: firestore.FieldValue.serverTimestamp(),
            endDate: firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
        };

        const cleanedData = cleanData(subscriptionWithTimestamp);

        // 1. Save to subcollection
        await subDoc.set(cleanedData);

        // 2. Update user document
        const userUpdate: any = {
            subscriptionStatus: 'active',
            subscriptionType: data.type,
            subscriptionExpiry: cleanedData.endDate,
            subscriptionSchedule: data.schedule || null,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        if (data.type === 'credits') {
            const userRef = firestore().collection('users').doc(userId);
            const userSnap = await userRef.get();
            const currentCredits = userSnap.exists() ? (userSnap.data()?.credits || 0) : 0;
            userUpdate.credits = currentCredits + (data.creditAmount || 0);
        }

        await firestore().collection('users').doc(userId).update(userUpdate);

        return subId;
    } catch (error: any) {
        console.error('Error creating subscription (Native):', error);
        throw error;
    }
}

/**
 * Cancels a user's active subscription (Native)
 * @param userId - Firebase Auth UID
 */
export async function cancelSubscription(userId: string) {
    try {
        const batch = firestore().batch();
        const userRef = firestore().collection('users').doc(userId);

        // 1. Update user document
        batch.update(userRef, {
            subscriptionStatus: 'inactive',
            credits: 0,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        // 2. Find active subscriptions to cancel
        const subsRef = userRef.collection('subscriptions');
        const activeSubs = await subsRef.where('status', '==', 'active').get();

        activeSubs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'cancelled',
                cancelledAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        });

        await batch.commit();
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
}
