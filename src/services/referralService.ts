import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ReferralCodeDoc {
  code: string;
  uid: string;
  name?: string;
  createdAt: any;
}

export interface ReferralRecord {
  id?: string;
  refereeUid: string;
  refereeName: string;
  refereePhone?: string;
  referrerUid: string;
  referralCode: string;
  status: 'claimed' | 'ordered' | 'rewarded' | 'rejected';
  discountAmount: number; // 200
  minOrderValue: number;  // 700
  orderId?: string;
  rewardCouponCode?: string;
  claimedAt: any;
  orderedAt?: any;
  rewardedAt?: any;
}

export interface ReferralStats {
  friendsInvited: number;
  ordersCompleted: number;
  totalEarned: number;
  myReferralCode: string;
  referrals: Array<{
    name: string;
    date: string;
    status: 'pending' | 'completed';
    rewardAmount: number;
  }>;
}

export const REFERRAL_CONSTANTS = {
  DISCOUNT_AMOUNT: 200,      // ₹200 off for referee
  MIN_ORDER_VALUE: 700,      // Minimum ₹700 cart
  REFERRER_REWARD: 200,      // ₹200 voucher for referrer
  REWARD_MIN_ORDER: 500,     // Minimum ₹500 for the referrer's reward voucher
  REWARD_VALIDITY_DAYS: 60,  // Referrer coupon valid for 60 days
};

/**
 * Generates a clean 8-character referral code: 4 letters from name + 4 random characters.
 * Excludes ambiguous characters (0, O, 1, I).
 */
export const generateReferralCode = (name?: string): string => {
  const cleanName = (name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);

  const prefix = cleanName.length >= 3 ? cleanName.padEnd(4, 'X') : 'SPIN';

  // Base characters excluding confusing lookalikes
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}${suffix}`;
};

/**
 * Retrieves the user's referral code or creates a new unique one if not assigned.
 */
export const getOrCreateUserReferralCode = async (
  userId: string,
  userName?: string
): Promise<string> => {
  if (!userId) throw new Error('User ID is required');

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.referralCode && typeof userData.referralCode === 'string') {
        return userData.referralCode.toUpperCase();
      }
    }

    // Generate unique code with collision checking
    let uniqueCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const candidate = generateReferralCode(userName);
      const codeRef = doc(db, 'referral_codes', candidate);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        uniqueCode = candidate;
        isUnique = true;

        // Reserve in referral_codes
        await setDoc(codeRef, {
          code: candidate,
          uid: userId,
          name: userName || 'Customer',
          createdAt: Timestamp.now(),
        });

        // Save to user document
        await updateDoc(userRef, {
          referralCode: candidate,
          updatedAt: Timestamp.now(),
        });
      }
    }

    if (!uniqueCode) {
      uniqueCode = `SPIN${Date.now().toString().slice(-4)}`;
    }

    return uniqueCode;
  } catch (error) {
    console.error('Error in getOrCreateUserReferralCode:', error);
    return `SPIN${userId.substring(0, 4).toUpperCase()}`;
  }
};

/**
 * Validates and claims a referral code for a user.
 * Can be called during Sign Up, in Profile, or when entering in Cart.
 */
export const claimReferralCode = async (
  code: string,
  currentUserId: string,
  currentUserName?: string,
  currentUserPhone?: string
): Promise<{
  success: boolean;
  referrerUid: string;
  discount: number;
  minOrderValue: number;
}> => {
  const normalizedCode = (code || '').trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('Please enter a referral code.');
  }

  // 1. Check if the code exists in referral_codes
  const codeRef = doc(db, 'referral_codes', normalizedCode);
  const codeSnap = await getDoc(codeRef);

  if (!codeSnap.exists()) {
    throw new Error('Invalid referral code. Please check and try again.');
  }

  const referralData = codeSnap.data() as ReferralCodeDoc;
  const referrerUid = referralData.uid;

  // 2. Prevent self-referral
  if (referrerUid === currentUserId) {
    throw new Error('You cannot use your own referral code.');
  }

  // 3. Check current user status
  const userRef = doc(db, 'users', currentUserId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};

  if (userData.referredBy) {
    if (userData.referredByCode === normalizedCode) {
      return {
        success: true,
        referrerUid,
        discount: REFERRAL_CONSTANTS.DISCOUNT_AMOUNT,
        minOrderValue: REFERRAL_CONSTANTS.MIN_ORDER_VALUE,
      };
    }
    throw new Error('You have already applied a referral code.');
  }

  // 4. Ensure referee is a new customer (has 0 completed/placed orders)
  const ordersRef = collection(db, 'users', currentUserId, 'orders');
  const ordersSnap = await getDocs(query(ordersRef, limit(3)));
  const nonCancelledOrders = ordersSnap.docs.filter(
    (d) => d.data().status !== 'cancelled'
  );

  if (nonCancelledOrders.length > 0) {
    throw new Error('Referral discounts are only valid for your first order.');
  }

  // 5. Create or update referral document in referrals/{currentUserId}
  const referralDocRef = doc(db, 'referrals', currentUserId);
  await setDoc(
    referralDocRef,
    {
      refereeUid: currentUserId,
      refereeName: currentUserName || userData.name || 'Friend',
      refereePhone: currentUserPhone || userData.phone || '',
      referrerUid,
      referralCode: normalizedCode,
      status: 'claimed',
      discountAmount: REFERRAL_CONSTANTS.DISCOUNT_AMOUNT,
      minOrderValue: REFERRAL_CONSTANTS.MIN_ORDER_VALUE,
      claimedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // 6. Link to users/{currentUserId}
  await updateDoc(userRef, {
    referredBy: referrerUid,
    referredByCode: normalizedCode,
    referredAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return {
    success: true,
    referrerUid,
    discount: REFERRAL_CONSTANTS.DISCOUNT_AMOUNT,
    minOrderValue: REFERRAL_CONSTANTS.MIN_ORDER_VALUE,
  };
};

/**
 * Validates a referral code entered in CartScreen.
 */
export const validateReferralCodeForCart = async (
  code: string,
  currentUserId: string,
  cartTotal: number
): Promise<{
  valid: boolean;
  referrerUid: string;
  code: string;
  discount: number;
  minOrderValue: number;
  error?: string;
}> => {
  const normalizedCode = (code || '').trim().toUpperCase();
  if (!normalizedCode) {
    return {
      valid: false,
      referrerUid: '',
      code: '',
      discount: 0,
      minOrderValue: 0,
      error: 'Enter a valid referral code.',
    };
  }

  try {
    const codeRef = doc(db, 'referral_codes', normalizedCode);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return {
        valid: false,
        referrerUid: '',
        code: '',
        discount: 0,
        minOrderValue: 0,
        error: 'Invalid coupon or referral code.',
      };
    }

    const { uid: referrerUid } = codeSnap.data() as ReferralCodeDoc;

    if (referrerUid === currentUserId) {
      return {
        valid: false,
        referrerUid: '',
        code: '',
        discount: 0,
        minOrderValue: 0,
        error: 'You cannot use your own referral code.',
      };
    }

    // Check user orders count
    const ordersRef = collection(db, 'users', currentUserId, 'orders');
    const ordersSnap = await getDocs(query(ordersRef, limit(2)));
    const activeOrders = ordersSnap.docs.filter((d) => d.data().status !== 'cancelled');

    if (activeOrders.length > 0) {
      return {
        valid: false,
        referrerUid: '',
        code: '',
        discount: 0,
        minOrderValue: 0,
        error: 'Referral discount is only valid on your first order.',
      };
    }

    // Min order check
    if (cartTotal < REFERRAL_CONSTANTS.MIN_ORDER_VALUE) {
      return {
        valid: false,
        referrerUid,
        code: normalizedCode,
        discount: REFERRAL_CONSTANTS.DISCOUNT_AMOUNT,
        minOrderValue: REFERRAL_CONSTANTS.MIN_ORDER_VALUE,
        error: `Add ₹${REFERRAL_CONSTANTS.MIN_ORDER_VALUE - cartTotal} more to apply referral offer (min ₹${REFERRAL_CONSTANTS.MIN_ORDER_VALUE}).`,
      };
    }

    return {
      valid: true,
      referrerUid,
      code: normalizedCode,
      discount: REFERRAL_CONSTANTS.DISCOUNT_AMOUNT,
      minOrderValue: REFERRAL_CONSTANTS.MIN_ORDER_VALUE,
    };
  } catch (error: any) {
    return {
      valid: false,
      referrerUid: '',
      code: '',
      discount: 0,
      minOrderValue: 0,
      error: error.message || 'Failed to validate referral code.',
    };
  }
};

/**
 * Fetches referral statistics and friends list for the Refer & Earn screen.
 */
export const getUserReferralStats = async (userId: string): Promise<ReferralStats> => {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap.data() || {};
    const myCode = userData.referralCode || (await getOrCreateUserReferralCode(userId, userData.name));

    // Query all referrals where this user is the referrer
    const referralsRef = collection(db, 'referrals');
    const q = query(referralsRef, where('referrerUid', '==', userId));
    const snap = await getDocs(q);

    let completedCount = 0;
    let totalEarned = 0;
    const referralsList: Array<{
      name: string;
      date: string;
      status: 'pending' | 'completed';
      rewardAmount: number;
    }> = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.status === 'rewarded') {
        completedCount++;
        totalEarned += REFERRAL_CONSTANTS.REFERRER_REWARD;
      }

      const dateStr = data.claimedAt?.toDate
        ? data.claimedAt.toDate().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Recently';

      referralsList.push({
        name: data.refereeName || 'A friend',
        date: dateStr,
        status: data.status === 'rewarded' ? 'completed' : 'pending',
        rewardAmount: REFERRAL_CONSTANTS.REFERRER_REWARD,
      });
    });

    return {
      friendsInvited: snap.docs.length,
      ordersCompleted: completedCount,
      totalEarned,
      myReferralCode: myCode,
      referrals: referralsList,
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return {
      friendsInvited: 0,
      ordersCompleted: 0,
      totalEarned: 0,
      myReferralCode: '',
      referrals: [],
    };
  }
};

/**
 * Rewards the referrer when the referee's first order is successfully delivered.
 * Creates an exclusive, single-use reward coupon for the referrer.
 */
export const rewardReferrerOnDelivered = async (
  refereeUid: string,
  orderId: string,
  orderTotal: number
): Promise<{ success: boolean; rewardCouponCode?: string }> => {
  try {
    const referralRef = doc(db, 'referrals', refereeUid);
    const referralSnap = await getDoc(referralRef);

    if (!referralSnap.exists()) {
      return { success: false };
    }

    const data = referralSnap.data() as ReferralRecord;

    // Only reward if not already rewarded
    if (data.status === 'rewarded') {
      return { success: true, rewardCouponCode: data.rewardCouponCode };
    }

    const referrerUid = data.referrerUid;
    if (!referrerUid) return { success: false };

    // Generate unique single-use reward coupon for referrer
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const rewardCouponCode = `REF200-${randomSuffix}`;

    const validTillDate = new Date();
    validTillDate.setDate(validTillDate.getDate() + REFERRAL_CONSTANTS.REWARD_VALIDITY_DAYS);

    // Save reward coupon in coupons/{rewardCouponCode}
    const couponRef = doc(db, 'coupons', rewardCouponCode);
    await setDoc(couponRef, {
      code: rewardCouponCode,
      title: 'Referral Reward — ₹200 OFF',
      description: 'Reward for inviting a friend to SpinZo! Enjoy ₹200 off your next order.',
      type: 'flat',
      value: REFERRAL_CONSTANTS.REFERRER_REWARD,
      maxDiscount: REFERRAL_CONSTANTS.REFERRER_REWARD,
      minOrderValue: REFERRAL_CONSTANTS.REWARD_MIN_ORDER,
      perUserLimit: 1,
      totalLimit: 1,
      usedCount: 0,
      audience: 'targeted',
      allowedUids: [referrerUid],
      excludedServices: [],
      isPublic: false,
      isActive: true,
      kind: 'referral_reward',
      validFrom: Timestamp.now(),
      validTill: Timestamp.fromDate(validTillDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'referral_system',
    });

    // Update referrals/{refereeUid}
    await updateDoc(referralRef, {
      status: 'rewarded',
      orderId,
      rewardCouponCode,
      rewardedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update referrer user document metrics
    const referrerUserRef = doc(db, 'users', referrerUid);
    await updateDoc(referrerUserRef, {
      'referralStats.ordersCompleted': increment(1),
      'referralStats.totalEarned': increment(REFERRAL_CONSTANTS.REFERRER_REWARD),
      updatedAt: Timestamp.now(),
    });

    return { success: true, rewardCouponCode };
  } catch (error) {
    console.error('Error rewarding referrer:', error);
    return { success: false };
  }
};
