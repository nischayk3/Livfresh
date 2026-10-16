import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
import { useSlotSettingsStore } from '../store/slotSettingsStore';
import {
  getOrCreateUserReferralCode,
  claimReferralCode,
  rewardReferrerOnDelivered,
} from './referralService';

const getMaxOrdersPerSlot = (): number => {
  return useSlotSettingsStore.getState().maxOrdersPerSlot || SLOT_CONSTANTS.MAX_ORDERS_PER_SLOT;
};

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
  invitedByReferralCode?: string
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
    }, { merge: true });

    // Generate unique shareable referral code for this user
    const myReferralCode = await getOrCreateUserReferralCode(userId, name);

    // If an invite referral code was provided at signup, claim it
    if (invitedByReferralCode && invitedByReferralCode.trim()) {
      try {
        await claimReferralCode(invitedByReferralCode.trim(), userId, name, phone);
      } catch (refErr: any) {
        console.warn('Could not claim referral code during signup:', refErr.message);
      }
    }

    console.log(`✅ User created: ${userId} (Referral Code: ${myReferralCode})`);
    return myReferralCode;
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

// Delete address
export const deleteAddress = async (userId: string, addressId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const addresses = userSnap.data().savedAddresses || [];
      const filtered = addresses.filter((addr: any) => addr.id !== addressId);
      await updateDoc(userRef, {
        savedAddresses: filtered,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error: any) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

// Check slot availability — returns only FULLY-OCCUPIED slots (count >= maxCapacity)
export const checkSlotAvailability = async (date: string, customLimit?: number): Promise<string[]> => {
  try {
    const limit = customLimit ?? getMaxOrdersPerSlot();
    const scheduleRef = doc(db, 'daily_schedules', date);
    const scheduleSnap = await getDoc(scheduleRef);
    if (scheduleSnap.exists()) {
      const data = scheduleSnap.data();
      // New format: slot_counts map { "10:00 - 11:00": 1, ... }
      if (data.slot_counts) {
        return Object.entries(data.slot_counts)
          .filter(([_, count]) => (count as number) >= limit)
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

// Tagged error for credit-redemption failures so the UI can show the reason
// instead of a generic "failed to place order".
const creditError = (code: string, message: string) => {
  const err: any = new Error(message);
  err.code = code;
  return err;
};

// Create order with slot reservation (Transaction)
export const createOrder = async (userId: string, orderData: any) => {
  try {
    const { pickupDetails, items } = orderData;
    const isScheduled = pickupDetails?.type === 'scheduled';
    const scheduleDate = pickupDetails?.scheduledDate; // YYYY-MM-DD
    const scheduleTime = pickupDetails?.scheduledTime; // "10:00 - 10:30"

    const ordersRef = collection(db, 'users', userId, 'orders');
    const orderId = doc(ordersRef).id; // Generate ID offline

    // Upload local photos if any exist in the items
    const updatedItems = [];
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.photoUrls && item.photoUrls.length > 0) {
          const localUris = item.photoUrls.filter((uri: string) => uri && !uri.startsWith('http://') && !uri.startsWith('https://'));
          const remoteUrls = item.photoUrls.filter((uri: string) => uri && (uri.startsWith('http://') || uri.startsWith('https://')));
          
          if (localUris.length > 0) {
            console.log(`[Upload] Uploading ${localUris.length} local photos for item: ${item.serviceName}`);
            const uploadedUrls = await uploadServicePhotos(localUris, orderId);
            item.photoUrls = [...remoteUrls, ...uploadedUrls];
          }
        }
        updatedItems.push(item);
      }
    }

    // Credit redemption is resolved here so the burn can ride along in the
    // order transaction below. A pre-generated usage-doc ID keeps it offline-safe.
    const creditItem = Array.isArray(items)
      ? items.find((i: any) => i.isCreditItem && i.creditSubscriptionId)
      : null;
    const creditSubscriptionId: string | undefined = creditItem?.creditSubscriptionId;
    const creditUsageId = creditSubscriptionId
      ? doc(collection(db, 'users', userId, 'subscriptions', creditSubscriptionId, 'creditUsage')).id
      : null;

    // Generate pickup OTP (4-digit)
    const pickupOTP = generateOTP();

    const orderWithTimestamp = {
      id: orderId, // Write ID as a field inside the document
      ...orderData,
      items: updatedItems,
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
      // ── All reads must precede all writes in a Firestore transaction ──

      // Slot reservation applies to ALL order types (instant AND scheduled).
      // Both consume the same delivery-partner capacity, so both must write to
      // daily_schedules to prevent double-booking. Test orders skip reservation
      // so they don't consume capacity.
      const scheduleRef = (scheduleDate && scheduleTime && !orderData.isTestOrder)
        ? doc(db, 'daily_schedules', scheduleDate)
        : null;
      const scheduleSnap = scheduleRef ? await transaction.get(scheduleRef) : null;

      const subscriptionRef = creditSubscriptionId
        ? doc(db, 'users', userId, 'subscriptions', creditSubscriptionId)
        : null;
      const subscriptionSnap = subscriptionRef ? await transaction.get(subscriptionRef) : null;

      // Coupon verification read (reads must precede all writes in Firestore transaction)
      const rawCouponCode = (orderData.coupon?.code || orderData.couponCode || '').toString().trim().toUpperCase();
      const isReferralOrder = Boolean(orderData.coupon?.isReferral || orderData.appliedReferralCode);
      const referralCodeCandidate = (orderData.appliedReferralCode || (isReferralOrder ? rawCouponCode : '')).toString().trim().toUpperCase();

      const couponRef = (rawCouponCode && !isReferralOrder) ? doc(db, 'coupons', rawCouponCode) : null;
      const couponSnap = couponRef ? await transaction.get(couponRef) : null;

      const redemptionRef = (rawCouponCode && !isReferralOrder && !orderData.isTestOrder)
        ? doc(db, 'coupon_redemptions', `${rawCouponCode}_${userId}`)
        : null;
      const redemptionSnap = redemptionRef ? await transaction.get(redemptionRef) : null;

      const referralCodeRef = (isReferralOrder && referralCodeCandidate)
        ? doc(db, 'referral_codes', referralCodeCandidate)
        : null;
      const referralCodeSnap = referralCodeRef ? await transaction.get(referralCodeRef) : null;

      const referralDocRef = isReferralOrder ? doc(db, 'referrals', userId) : null;
      const referralDocSnap = referralDocRef ? await transaction.get(referralDocRef) : null;

      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = (rawCouponCode || isReferralOrder) ? await transaction.get(userDocRef) : null;

      // ── Writes ──

      if (scheduleRef && scheduleSnap) {
        const slotCounts: Record<string, number> = scheduleSnap.exists()
          ? (scheduleSnap.data().slot_counts || {})
          : {};
        const currentCount = slotCounts[scheduleTime] || 0;
        const maxCapacity = getMaxOrdersPerSlot();

        if (currentCount >= maxCapacity) {
          throw new Error(`This time slot is no longer available. Please try a different time.`);
        }

        transaction.set(scheduleRef, {
          slot_counts: { ...slotCounts, [scheduleTime]: currentCount + 1 }
        }, { merge: true });
      }

      // Burn the credit inside the same transaction that creates the order, so
      // an order can never exist without its credit deducted. If the pack is
      // missing, inactive, expired or exhausted the whole transaction aborts —
      // no order and no slot reservation are created.
      let creditBurnInfo: { subscriptionId: string; creditIndex: number; creditUsageId: string } | null = null;

      if (subscriptionRef && subscriptionSnap) {
        if (!subscriptionSnap.exists()) {
          throw creditError('CREDIT_SUBSCRIPTION_MISSING', 'Your credit pack could not be found. Please contact support.');
        }

        const sub = subscriptionSnap.data() as any;
        const remaining = sub.creditsRemaining ?? sub.credits_remaining ?? 0;
        const used = sub.creditsUsed ?? sub.credits_used ?? 0;
        const creditIndex = sub.currentCreditIndex ?? sub.current_credit_index ?? 0;
        const status = sub.status || 'active';

        if (status !== 'active' || sub.isActive === false) {
          throw creditError('CREDIT_SUBSCRIPTION_INACTIVE', 'This credit pack is no longer active.');
        }
        if (remaining <= 0) {
          throw creditError('CREDIT_EXHAUSTED', 'You have no credits left in this pack. Please buy a new pack to continue.');
        }

        const newUsed = used + 1;
        const newRemaining = remaining - 1;
        const newIndex = newRemaining > 0 ? creditIndex + 1 : creditIndex;
        const newStatus = newRemaining === 0 ? 'completed' : 'active';

        creditBurnInfo = { subscriptionId: creditSubscriptionId!, creditIndex, creditUsageId: creditUsageId! };

        transaction.set(
          doc(db, 'users', userId, 'subscriptions', creditSubscriptionId!, 'creditUsage', creditUsageId!),
          {
            subscriptionId: creditSubscriptionId,
            userId,
            creditIndex,
            orderId,
            usedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
          }
        );

        transaction.update(subscriptionRef, {
          creditsUsed: newUsed,
          creditsRemaining: newRemaining,
          currentCreditIndex: newIndex,
          status: newStatus,
          updatedAt: Timestamp.now(),
          // Legacy snake_case mirror
          credits_used: newUsed,
          credits_remaining: newRemaining,
          current_credit_index: newIndex,
        });
      }

      // ── Coupon Atomic Validation & Burn ──
      let verifiedDiscount = cleanOrder.billDetails?.discount || 0;
      let appliedCouponPayload: any = null;

      if (couponRef && couponSnap) {
        if (!couponSnap.exists()) {
          throw new Error(`Coupon "${rawCouponCode}" does not exist.`);
        }
        const cData = couponSnap.data() as any;
        if (cData.isActive === false) {
          throw new Error(`Coupon "${rawCouponCode}" is no longer active.`);
        }
        const now = new Date();
        if (cData.validTill && new Date(cData.validTill) < now) {
          throw new Error(`Coupon "${rawCouponCode}" has expired.`);
        }
        const subtotal = cleanOrder.billDetails?.itemTotal || 0;
        if (cData.minOrderValue && subtotal < cData.minOrderValue) {
          throw new Error(`Minimum order value of ₹${cData.minOrderValue} required for coupon "${rawCouponCode}".`);
        }

        const userUsageMap = userDocSnap?.exists() ? (userDocSnap.data()?.couponUsage || {}) : {};
        const currentUsage = (typeof userUsageMap[rawCouponCode] === 'number')
          ? userUsageMap[rawCouponCode]
          : (redemptionSnap && redemptionSnap.exists() ? 1 : 0);
        const perUserLimit = cData.perUserLimit || 1;

        if (currentUsage >= perUserLimit) {
          throw new Error(
            perUserLimit > 1
              ? `You have already used coupon "${rawCouponCode}" ${currentUsage} times (maximum allowed: ${perUserLimit}).`
              : `You have already used coupon "${rawCouponCode}".`
          );
        }

        // Check first order / max order count restrictions
        const userOrderCount = userDocSnap?.exists() ? (userDocSnap.data()?.orderCount || 0) : 0;
        if (cData.isFirstOrderOnly && userOrderCount > 0) {
          throw new Error(`Coupon "${rawCouponCode}" is only valid on your first order.`);
        }
        if (cData.maxOrderCount && userOrderCount >= cData.maxOrderCount) {
          throw new Error(`Coupon "${rawCouponCode}" is only valid on your first ${cData.maxOrderCount} orders.`);
        }

        // Check restricted phone numbers (VIP / targeted coupons)
        if (cData.allowedPhoneNumbers && Array.isArray(cData.allowedPhoneNumbers) && cData.allowedPhoneNumbers.length > 0) {
          const rawOrderPhone = (cleanOrder.customerPhone || cleanOrder.userPhone || userDocSnap?.data()?.phoneNumber || userDocSnap?.data()?.phone || '')
            .replace(/\D/g, '')
            .slice(-10);
          const isWhitelisted = cData.allowedPhoneNumbers.some(
            (p: string) => p.replace(/\D/g, '').slice(-10) === rawOrderPhone
          );
          if (!isWhitelisted) {
            throw new Error('This coupon is exclusive to selected accounts.');
          }
        }

        if (cData.totalLimit && (cData.usedCount || 0) >= cData.totalLimit) {
          throw new Error(`Coupon "${rawCouponCode}" has reached its maximum redemption limit.`);
        }

        // Calculate verified discount on the server/transaction level
        let calcDiscount = 0;
        if (cData.discountType === 'flat') {
          calcDiscount = cData.discountAmount || 0;
        } else if (cData.discountType === 'percentage') {
          const pct = cData.discountPercent || 0;
          const maxCap = cData.maxDiscount || Infinity;
          calcDiscount = Math.min(maxCap, Math.round((subtotal * pct) / 100));
        }
        verifiedDiscount = Math.min(subtotal, Math.max(0, calcDiscount));

        appliedCouponPayload = {
          code: rawCouponCode,
          title: cData.title || rawCouponCode,
          discount: verifiedDiscount,
          appliedAt: Timestamp.now(),
        };

        // Burn redemption record for audit history
        const userRedemptionIndexRef = doc(db, 'coupon_redemptions', `${rawCouponCode}_${userId}_${currentUsage + 1}`);
        transaction.set(userRedemptionIndexRef, {
          code: rawCouponCode,
          userId,
          orderId,
          redemptionIndex: currentUsage + 1,
          discountAmount: verifiedDiscount,
          createdAt: Timestamp.now(),
        });

        // Legacy compatibility doc
        if (redemptionRef && currentUsage === 0) {
          transaction.set(redemptionRef, {
            code: rawCouponCode,
            userId,
            orderId,
            discountAmount: verifiedDiscount,
            createdAt: Timestamp.now(),
          });
        }

        // Update user's personal coupon usage map
        transaction.set(
          userDocRef,
          {
            couponUsage: {
              ...userUsageMap,
              [rawCouponCode]: currentUsage + 1,
            },
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );

        // Increment coupon usedCount
        transaction.update(couponRef, {
          usedCount: (cData.usedCount || 0) + 1,
          updatedAt: Timestamp.now(),
        });
      } else if (isReferralOrder && referralCodeSnap) {
        if (!referralCodeSnap.exists()) {
          throw new Error(`Referral code "${referralCodeCandidate}" does not exist.`);
        }
        const refOwnerUid = (referralCodeSnap.data() as any).uid;
        if (refOwnerUid === userId) {
          throw new Error('You cannot use your own referral code.');
        }
        const subtotal = cleanOrder.billDetails?.itemTotal || 0;
        if (subtotal < 700) {
          throw new Error(`Minimum order value of ₹700 required to apply referral offer.`);
        }

        verifiedDiscount = Math.min(subtotal, 200);

        appliedCouponPayload = {
          code: referralCodeCandidate,
          title: 'Referral Discount — ₹200 OFF',
          discount: verifiedDiscount,
          isReferral: true,
          referrerUid: refOwnerUid,
          appliedAt: Timestamp.now(),
        };

        if (referralDocRef) {
          transaction.set(
            referralDocRef,
            {
              refereeUid: userId,
              refereeName: cleanOrder.customerName || '',
              refereePhone: cleanOrder.customerPhone || cleanOrder.userPhone || '',
              referrerUid: refOwnerUid,
              referralCode: referralCodeCandidate,
              status: 'ordered',
              orderId,
              discountAmount: verifiedDiscount,
              orderedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );
        }

        if (userDocRef) {
          transaction.update(userDocRef, {
            referredBy: refOwnerUid,
            referredByCode: referralCodeCandidate,
            updatedAt: Timestamp.now(),
          });
        }
      }

      const finalBillDetails = {
        ...(cleanOrder.billDetails || {}),
        discount: verifiedDiscount,
        total: Math.max(
          0,
          (cleanOrder.billDetails?.itemTotal || 0) +
            (cleanOrder.billDetails?.platformFee || 0) +
            (cleanOrder.billDetails?.deliveryFee || 0) +
            (cleanOrder.billDetails?.gst || 0) -
            verifiedDiscount
        ),
      };

      const orderPayload = {
        ...cleanOrder,
        billDetails: finalBillDetails,
        ...(appliedCouponPayload ? { coupon: appliedCouponPayload } : {}),
        ...(creditBurnInfo ? { isCreditBurned: true, creditBurnInfo } : {}),
      };

      // Create User Order
      transaction.set(doc(db, 'users', userId, 'orders', orderId), orderPayload);

      // Mirror to Vendor Order
      const vendorId = orderData.vendorId || 'default';
      transaction.set(doc(db, 'vendors', vendorId, 'orders', orderId), {
        ...orderPayload,
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

      // Release the original pickup slot — pickup is now complete
      if (!currentOrder.isTestOrder && !currentOrder.pickupSlotReleased) {
        const pickupDate = currentOrder.pickupDetails?.scheduledDate;
        const pickupTime = currentOrder.pickupDetails?.scheduledTime;
        if (pickupDate && pickupTime) {
          const schedRef = doc(db, 'daily_schedules', pickupDate);
          const schedSnap = await getDoc(schedRef);
          if (schedSnap.exists()) {
            const sc = schedSnap.data().slot_counts || {};
            const cur = sc[pickupTime] || 0;
            if (cur > 0) {
              await updateDoc(schedRef, { [`slot_counts.${pickupTime}`]: Math.max(0, cur - 1) });
            }
          }
        }
        updateData.pickupSlotReleased = true;
      }
    }

    // Verify delivery OTP
    if (options?.verifyDelivery) {
      if (options.deliveryOTP !== currentOrder.deliveryOTP) {
        throw new Error('Invalid delivery OTP');
      }
      updateData.deliveryVerified = true;
      updateData.deliveredAt = timestamp;

      // Release the delivery slot — delivery is now complete
      if (!currentOrder.isTestOrder && !currentOrder.deliverySlotReleased) {
        const delDate = currentOrder.deliveryDate;
        const delTime = currentOrder.deliveryTime;
        if (delDate && delTime) {
          const schedRef = doc(db, 'daily_schedules', delDate);
          const schedSnap = await getDoc(schedRef);
          if (schedSnap.exists()) {
            const sc = schedSnap.data().slot_counts || {};
            const cur = sc[delTime] || 0;
            if (cur > 0) {
              await updateDoc(schedRef, { [`slot_counts.${delTime}`]: Math.max(0, cur - 1) });
            }
          }
        }
        updateData.deliverySlotReleased = true;
      }
    }

    // ─── Cancellation: release ALL reserved slots ───
    if (status === 'cancelled' && !currentOrder.isTestOrder) {
      // Release pickup slot (only if not already released by pickup verification)
      if (!currentOrder.pickupSlotReleased) {
        const pickupDate = currentOrder.pickupDetails?.scheduledDate;
        const pickupTime = currentOrder.pickupDetails?.scheduledTime;
        if (pickupDate && pickupTime) {
          const schedRef = doc(db, 'daily_schedules', pickupDate);
          const schedSnap = await getDoc(schedRef);
          if (schedSnap.exists()) {
            const sc = schedSnap.data().slot_counts || {};
            const cur = sc[pickupTime] || 0;
            if (cur > 0) {
              await updateDoc(schedRef, { [`slot_counts.${pickupTime}`]: Math.max(0, cur - 1) });
            }
          }
        }
      }
      // Release delivery slot (only if not already released by delivery verification)
      if (!currentOrder.deliverySlotReleased) {
        const delDate = currentOrder.deliveryDate;
        const delTime = currentOrder.deliveryTime;
        if (delDate && delTime) {
          const schedRef = doc(db, 'daily_schedules', delDate);
          const schedSnap = await getDoc(schedRef);
          if (schedSnap.exists()) {
            const sc = schedSnap.data().slot_counts || {};
            const cur = sc[delTime] || 0;
            if (cur > 0) {
              await updateDoc(schedRef, { [`slot_counts.${delTime}`]: Math.max(0, cur - 1) });
            }
          }
        }
      }
    }

    // Add token number
    if (options?.tokenNumber) {
      updateData.tokenNumber = options.tokenNumber;
    }

    // Update user order
    await updateDoc(orderRef, updateData);

    // Update vendor order
    await updateDoc(doc(db, 'vendors', vendorId, 'orders', orderId), updateData);

    // If order was delivered, reward the referrer if referee was referred!
    if (status === 'delivered') {
      rewardReferrerOnDelivered(userId, orderId, currentOrder.billDetails?.total || 0).catch((err) => {
        console.warn('Could not reward referrer on order delivery:', err);
      });
    }

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
 * Fallback: Mark an order as paid directly in Firestore.
 * Called when the Cloud Function verifyRazorpayPayment fails (e.g., iOS app-switch,
 * cold start timeout, network issues). Writes to both user and vendor order docs.
 *
 * NOTE: This is a safety net, NOT a replacement for server-side verification.
 * The Razorpay webhook should also catch these, but as a defense-in-depth
 * measure we write from the client when all else fails.
 */
export const markOrderAsPaidDirectly = async (
  orderId: string,
  razorpayPaymentId: string
): Promise<void> => {
  try {
    const { auth } = await import('./firebase');
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }

    const orderData = orderSnap.data();

    // Don't overwrite if already paid
    if (orderData.paymentStatus === 'paid') {
      console.log('markOrderAsPaidDirectly: order already paid, skipping');
      return;
    }

    const vendorId = orderData.vendorId || 'default';
    const timestamp = Timestamp.now();

    const paymentUpdate = {
      paymentStatus: 'paid',
      paymentId: razorpayPaymentId,
      paymentMethod: 'razorpay',
      paidAt: timestamp,
      updatedAt: timestamp,
      paymentSource: 'client_fallback', // Track that this was a fallback write
    };

    // Update user order
    await updateDoc(orderRef, paymentUpdate);

    // Update vendor order mirror
    try {
      const vendorOrderRef = doc(db, 'vendors', vendorId, 'orders', orderId);
      await updateDoc(vendorOrderRef, paymentUpdate);
    } catch (vendorErr) {
      // Don't fail if vendor mirror update fails — user order is the source of truth
      console.warn('markOrderAsPaidDirectly: vendor mirror update failed', vendorErr);
    }

    console.log(`markOrderAsPaidDirectly: ✅ Order ${orderId} marked as paid (fallback)`);
  } catch (error: any) {
    console.error('markOrderAsPaidDirectly: failed', error);
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
      // 1. Read Order first to check test order flag
      const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
      const userOrderSnap = await transaction.get(userOrderRef);

      if (!userOrderSnap.exists()) {
        throw new Error('Order not found');
      }

      const orderData = userOrderSnap.data();
      const vendorId = orderData.vendorId || 'vendor_1'; // fallback
      const timestamp = Timestamp.now();

      // 2. Check & Reserve Slot in Global Schedule (skip for test orders)
      const scheduleRef = doc(db, 'daily_schedules', deliveryDate);
      if (!orderData.isTestOrder) {
        const scheduleSnap = await transaction.get(scheduleRef);

        const slotCounts: Record<string, number> = scheduleSnap.exists()
          ? (scheduleSnap.data().slot_counts || {})
          : {};
        const currentCount = slotCounts[deliveryTime] || 0;
        const maxCapacity = getMaxOrdersPerSlot();

        if (currentCount >= maxCapacity) {
          throw new Error(`Slot ${deliveryTime} is no longer available.`);
        }

        // Reserve Slot (increment count)
        transaction.set(scheduleRef, {
          slot_counts: { ...slotCounts, [deliveryTime]: currentCount + 1 }
        }, { merge: true });
      }

      const updateData = {
        deliveryDate,
        deliveryTime,
        deliveryScheduledAt: timestamp,
        updatedAt: timestamp,
      };

      // 3. Update both user and vendor orders
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

export interface UnserviceablePayload {
  latitude: number;
  longitude: number;
  address?: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  cartValue?: number;
  itemsCount?: number;
  itemsSummary?: string;
  items?: any[];
}

export const logUnserviceableRequest = async (
  userId: string,
  payload: UnserviceablePayload
) => {
  try {
    await addDoc(collection(db, 'unserviceable_requests'), {
      userId,
      location: {
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
      address: payload.address || 'Unknown Address',
      userName: payload.userName || '',
      userPhone: payload.userPhone || '',
      userEmail: payload.userEmail || '',
      cartValue: payload.cartValue || 0,
      itemsCount: payload.itemsCount || 0,
      itemsSummary: payload.itemsSummary || '',
      items: payload.items || [],
      timestamp: Timestamp.now(),
      status: 'new', // 'new' | 'contacted' | 'converted' | 'rejected'
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Unserviceable request logged with customer and cart context');
  } catch (error) {
    console.error('Error logging unserviceable request:', error);
    // Don't throw, just log. We don't want to block the UI flow if logging fails.
  }
};

export const updateDemandRequestStatus = async (
  requestId: string,
  status: 'new' | 'contacted' | 'converted' | 'rejected',
  notes?: string
) => {
  try {
    const docRef = doc(db, 'unserviceable_requests', requestId);
    const updateData: any = {
      status,
      updatedAt: Timestamp.now(),
    };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    await updateDoc(docRef, updateData);
    console.log(`✅ Demand request ${requestId} updated to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating demand request status:', error);
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
 * Revert a credit burn when a credit-paid order is cancelled.
 *
 * Reads the order doc inside a Firestore transaction, looks up the
 * creditBurnInfo written by createOrder(), then atomically:
 *  1. Deletes the creditUsage sub-document
 *  2. Restores the subscription's creditsRemaining (+1), creditsUsed (-1),
 *     currentCreditIndex, and status (back to 'active' if it was 'completed')
 *  3. Sets the order's isCreditBurned → false
 *
 * Safe to call multiple times (idempotent) — once isCreditBurned is false
 * the early-return guard skips further reversals.
 */
export async function revertCreditOnCancel(userId: string, orderId: string): Promise<boolean> {
  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'users', userId, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        console.warn('[revertCreditOnCancel] Order not found:', orderId);
        return;
      }

      const orderData = orderSnap.data() || {};

      // Guard: only revert if this order had a credit that was actually burned
      const creditBurnInfo = orderData.creditBurnInfo;
      if (!creditBurnInfo || orderData.isCreditBurned !== true) {
        console.log('[revertCreditOnCancel] Order was not credit-burned, no-op:', orderId);
        return;
      }

      const { subscriptionId, creditIndex, creditUsageId } = creditBurnInfo;
      if (!subscriptionId || !creditUsageId) {
        console.warn('[revertCreditOnCancel] Incomplete creditBurnInfo on order:', orderId, creditBurnInfo);
        return;
      }

      // ── Reads must precede writes in a Firestore transaction ──
      const subscriptionRef = doc(db, 'users', userId, 'subscriptions', subscriptionId);
      const subSnap = await transaction.get(subscriptionRef);

      // ── Writes ──

      // 1. Delete the credit usage record
      transaction.delete(
        doc(db, 'users', userId, 'subscriptions', subscriptionId, 'creditUsage', creditUsageId)
      );

      // 2. Restore subscription counters
      if (subSnap.exists()) {
        const subData = subSnap.data();
        const currentCreditsRemaining = subData.creditsRemaining ?? subData.credits_remaining ?? 0;
        const currentCreditsUsed = subData.creditsUsed ?? subData.credits_used ?? 0;
        const restoredRemaining = currentCreditsRemaining + 1;
        const restoredUsed = Math.max(0, currentCreditsUsed - 1);

        transaction.update(subscriptionRef, {
          creditsRemaining: restoredRemaining,
          creditsUsed: restoredUsed,
          currentCreditIndex: creditIndex,
          status: 'active',
          updatedAt: Timestamp.now(),
          // Legacy snake_case
          credits_remaining: restoredRemaining,
          credits_used: restoredUsed,
          current_credit_index: creditIndex,
        });
      } else {
        console.warn('[revertCreditOnCancel] Subscription not found to restore:', subscriptionId);
      }

      // 3. Mark order — credit is no longer burned
      transaction.update(orderRef, {
        isCreditBurned: false,
        creditBurnInfo: null,
      });

      console.log(`[revertCreditOnCancel] Reversed credit for order ${orderId} on subscription ${subscriptionId}`);
    });

    return true;
  } catch (error) {
    console.error('[revertCreditOnCancel] Failed:', error);
    return false;
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
