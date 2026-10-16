import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from './firebase';
import { db, adminDb, adminAuth, auth } from './firebase';

export interface Coupon {
  id: string; // uppercase code
  code: string;
  title: string;
  description: string;
  discountType: 'flat' | 'percentage';
  discountAmount: number; // e.g. 200 for flat
  discountPercent?: number; // e.g. 20 for 20%
  maxDiscount?: number; // max cap for percentage discounts
  minOrderValue: number; // min subtotal required (e.g. 700)
  isFirstOrderOnly: boolean; // only for users with orderCount === 0
  maxOrderCount?: number; // max orderCount limit (e.g. 3 for first 3 orders)
  perUserLimit: number; // default 1 (or 3 for FIRST100)
  totalLimit?: number; // max total redemptions across all users
  usedCount: number; // current redemptions count
  validFrom?: string; // ISO date string
  validTill?: string; // ISO date string
  isActive: boolean;
  isPublic: boolean; // true = shown in Cart offers list; false = secret/marketing-only
  allowedPhoneNumbers?: string[]; // whitelist of 10-digit phone numbers allowed to apply
  excludeIroningOnly?: boolean; // default true
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

/**
 * Execute an admin operation with automatic DB fallback between adminDb and db
 * in case of permission or auth instance mismatch.
 */
export const runAdminFirestoreOp = async <T>(op: (targetDb: any) => Promise<T>): Promise<T> => {
  const primaryDb = adminAuth?.currentUser ? adminDb : (auth?.currentUser ? db : adminDb);
  try {
    return await op(primaryDb);
  } catch (err: any) {
    const isPermErr =
      err?.code === 'permission-denied' ||
      (err?.message && err.message.toLowerCase().includes('permission'));
    if (isPermErr) {
      const fallbackDb = primaryDb === adminDb ? db : adminDb;
      console.warn('[couponService] Permission issue on primary DB, retrying with fallback DB instance...');
      return await op(fallbackDb);
    }
    throw err;
  }
};

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  reason?: string;
}

export interface CartItemLike {
  id?: string;
  serviceType?: string;
  isCreditItem?: boolean;
  totalPrice?: number;
}

// ─── Default seed coupons ─────────────────────────────────────────────────────

export const DEFAULT_COUPONS: Omit<Coupon, 'id'>[] = [
  {
    code: 'FLAT200',
    title: 'Flat ₹200 OFF',
    description: 'Get flat ₹200 off on your laundry order above ₹700',
    discountType: 'flat',
    discountAmount: 200,
    minOrderValue: 700,
    isFirstOrderOnly: false,
    perUserLimit: 1,
    usedCount: 0,
    isActive: true,
    isPublic: true,
    excludeIroningOnly: true,
  },
  {
    code: 'FIRST100',
    title: 'Welcome Offer - ₹100 OFF',
    description: 'Get flat ₹100 off on each of your first 3 orders above ₹700',
    discountType: 'flat',
    discountAmount: 100,
    minOrderValue: 700,
    isFirstOrderOnly: false,
    maxOrderCount: 3,
    perUserLimit: 3,
    usedCount: 0,
    isActive: true,
    isPublic: true,
    excludeIroningOnly: true,
  },
];

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Fetch all active public coupons for the Cart screen
 */
export const getActivePublicCoupons = async (): Promise<Coupon[]> => {
  try {
    const couponsRef = collection(db, 'coupons');
    const q = query(
      couponsRef,
      where('isActive', '==', true),
      where('isPublic', '==', true)
    );
    const snap = await getDocs(q);
    const coupons: Coupon[] = [];
    snap.forEach((d) => {
      coupons.push({ id: d.id, ...d.data() } as Coupon);
    });

    // If no coupons exist in Firestore yet, seed defaults automatically
    if (coupons.length === 0) {
      await seedDefaultCoupons();
      return DEFAULT_COUPONS.map((c) => ({ id: c.code, ...c }));
    }

    return coupons;
  } catch (error) {
    console.warn('[couponService] Error fetching public coupons:', error);
    return DEFAULT_COUPONS.map((c) => ({ id: c.code, ...c }));
  }
};

/**
 * Fetch a single coupon by uppercase code
 */
export const getCouponByCode = async (code: string): Promise<Coupon | null> => {
  try {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;
    const couponRef = doc(db, 'coupons', cleanCode);
    const snap = await getDoc(couponRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Coupon;
  } catch (error) {
    console.error('[couponService] Error fetching coupon by code:', error);
    return null;
  }
};

/**
 * Check how many times a user has redeemed a coupon
 */
export const getUserCouponRedemptionCount = async (
  code: string,
  userId: string
): Promise<number> => {
  try {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !userId) return 0;

    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const usage = userSnap.data()?.couponUsage?.[cleanCode];
      if (typeof usage === 'number') return usage;
    }

    // Fallback: check legacy single redemption doc
    const redemptionId = `${cleanCode}_${userId}`;
    const legacySnap = await getDoc(doc(db, 'coupon_redemptions', redemptionId));
    return legacySnap.exists() ? 1 : 0;
  } catch (error) {
    console.warn('[couponService] Error checking redemption count:', error);
    return 0;
  }
};

/**
 * Check if a user has already redeemed this coupon up to its perUserLimit
 */
export const hasUserRedeemedCoupon = async (
  code: string,
  userId: string,
  perUserLimit: number = 1
): Promise<boolean> => {
  const count = await getUserCouponRedemptionCount(code, userId);
  return count >= perUserLimit;
};

// ─── Validation Engine ────────────────────────────────────────────────────────

/**
 * Validate a coupon against the current cart and user state
 */
export const validateCouponForCart = async (params: {
  code: string;
  userId?: string;
  userPhone?: string;
  subtotal: number;
  items: CartItemLike[];
  orderCount?: number;
}): Promise<CouponValidationResult> => {
  const { code, userId, userPhone, subtotal, items, orderCount = 0 } = params;
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    return { valid: false, discount: 0, reason: 'Please enter a valid coupon code.' };
  }

  // 1. Fetch coupon definition
  let coupon = await getCouponByCode(cleanCode);

  // Fallback to default in-memory definitions if not seeded yet
  if (!coupon) {
    const defaultMatch = DEFAULT_COUPONS.find((c) => c.code === cleanCode);
    if (defaultMatch) {
      coupon = { id: defaultMatch.code, ...defaultMatch };
    } else {
      return { valid: false, discount: 0, reason: `Coupon code "${cleanCode}" is invalid.` };
    }
  }

  // 2. Active status check
  if (!coupon.isActive) {
    return { valid: false, discount: 0, reason: `Coupon "${cleanCode}" is no longer active.` };
  }

  // 3. Expiry date check
  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { valid: false, discount: 0, reason: `Coupon "${cleanCode}" is not active yet.` };
  }
  if (coupon.validTill && new Date(coupon.validTill) < now) {
    return { valid: false, discount: 0, reason: `Coupon "${cleanCode}" has expired.` };
  }

  // 4. Subscription credit exclusion
  if (items.some((i) => i.isCreditItem)) {
    return {
      valid: false,
      discount: 0,
      reason: 'Coupons cannot be combined with subscription credits.',
    };
  }

  // 5. Standalone ironing exclusion
  const isIroningOnly =
    items.length > 0 && items.every((i) => i.serviceType === 'ironing');
  if (coupon.excludeIroningOnly !== false && isIroningOnly) {
    return {
      valid: false,
      discount: 0,
      reason: 'This coupon is not applicable on standalone ironing orders.',
    };
  }

  // 6. Minimum cart value check
  if (subtotal < coupon.minOrderValue) {
    const diff = coupon.minOrderValue - subtotal;
    return {
      valid: false,
      discount: 0,
      reason: `Add items worth ₹${diff} more to apply coupon "${cleanCode}".`,
    };
  }

  // 7. First order only check
  if (coupon.isFirstOrderOnly && orderCount > 0) {
    return {
      valid: false,
      discount: 0,
      reason: `Coupon "${cleanCode}" is only valid on your first order.`,
    };
  }

  // 7b. Max order count check (e.g. valid on first 3 orders)
  if (coupon.maxOrderCount && orderCount >= coupon.maxOrderCount) {
    return {
      valid: false,
      discount: 0,
      reason: `Coupon "${cleanCode}" is only valid on your first ${coupon.maxOrderCount} orders.`,
    };
  }

  // 8. Total company-wide usage limit check
  if (coupon.totalLimit && (coupon.usedCount || 0) >= coupon.totalLimit) {
    return {
      valid: false,
      discount: 0,
      reason: `Coupon "${cleanCode}" has reached its maximum redemption limit.`,
    };
  }

  // 8b. Restricted Phone Numbers check (Customer-Restricted / Private Coupon)
  if (coupon.allowedPhoneNumbers && coupon.allowedPhoneNumbers.length > 0) {
    const rawUserPhone = (userPhone || '').replace(/\D/g, '').slice(-10);
    const isWhitelisted = coupon.allowedPhoneNumbers.some(
      (p) => p.replace(/\D/g, '').slice(-10) === rawUserPhone
    );
    if (!isWhitelisted) {
      return {
        valid: false,
        discount: 0,
        reason: 'This coupon is exclusive to selected accounts.',
      };
    }
  }

  // 9. Per-user redemption check (Crucial Anti-Misuse Check)
  if (userId) {
    const limit = coupon.perUserLimit || 1;
    const timesUsed = await getUserCouponRedemptionCount(cleanCode, userId);
    if (timesUsed >= limit) {
      return {
        valid: false,
        discount: 0,
        reason:
          limit > 1
            ? `You have already used coupon "${cleanCode}" ${timesUsed} times (maximum allowed: ${limit}).`
            : `You have already used coupon "${cleanCode}".`,
      };
    }
  }

  // 10. Compute discount amount
  let calculatedDiscount = 0;
  if (coupon.discountType === 'flat') {
    calculatedDiscount = coupon.discountAmount;
  } else if (coupon.discountType === 'percentage') {
    const pct = coupon.discountPercent || 0;
    const maxCap = coupon.maxDiscount || Infinity;
    calculatedDiscount = Math.min(maxCap, Math.round((subtotal * pct) / 100));
  }

  // Clamp discount so total never goes below 0
  const finalDiscount = Math.min(subtotal, Math.max(0, calculatedDiscount));

  return {
    valid: true,
    coupon,
    discount: finalDiscount,
  };
};

// ─── Admin Operations ─────────────────────────────────────────────────────────

/**
 * Fetch all coupons for the Admin management panel
 */
export const getAllCouponsAdmin = async (): Promise<Coupon[]> => {
  return await runAdminFirestoreOp(async (activeDb) => {
    const couponsRef = collection(activeDb, 'coupons');
    const snap = await getDocs(couponsRef);
    const list: Coupon[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Coupon);
    });

    if (list.length === 0) {
      await seedDefaultCoupons();
      const snap2 = await getDocs(couponsRef);
      const recheckList: Coupon[] = [];
      snap2.forEach((d) => {
        recheckList.push({ id: d.id, ...d.data() } as Coupon);
      });
      if (recheckList.length > 0) {
        return recheckList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      }
      return DEFAULT_COUPONS.map((c) => ({ id: c.code, ...c }));
    }

    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }).catch((error) => {
    console.error('[couponService] Error fetching all coupons (admin):', error);
    return DEFAULT_COUPONS.map((c) => ({ id: c.code, ...c }));
  });
};

/**
 * Create or update a coupon (Admin only)
 */
export const saveCouponAdmin = async (
  couponData: Omit<Coupon, 'id'> & { id?: string }
): Promise<void> => {
  const cleanCode = couponData.code.trim().toUpperCase();
  if (!cleanCode) throw new Error('Coupon code is required.');

  await runAdminFirestoreOp(async (activeDb) => {
    const docRef = doc(activeDb, 'coupons', cleanCode);
    const rawPayload: any = {
      ...couponData,
      code: cleanCode,
      updatedAt: Timestamp.now(),
      createdBy: adminAuth.currentUser?.phoneNumber || auth.currentUser?.phoneNumber || couponData.createdBy || 'admin',
    };

    if (!couponData.createdAt) {
      rawPayload.createdAt = Timestamp.now();
    }

    // Critical: Firestore throws if any property is undefined. Strip all undefined keys.
    const payload: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawPayload)) {
      if (val !== undefined) {
        payload[key] = val;
      }
    }

    console.log('[couponService] Saving coupon payload to Firestore:', cleanCode, payload);
    await setDoc(docRef, payload, { merge: true });
    console.log('[couponService] Coupon saved successfully:', cleanCode);
  });
};

/**
 * Toggle active status of a coupon (Admin only)
 */
export const toggleCouponStatusAdmin = async (
  code: string,
  isActive: boolean
): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  await runAdminFirestoreOp(async (activeDb) => {
    const docRef = doc(activeDb, 'coupons', cleanCode);
    await updateDoc(docRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });
  });
};

/**
 * Delete a coupon (Admin only)
 */
export const deleteCouponAdmin = async (code: string): Promise<void> => {
  const cleanCode = code.trim().toUpperCase();
  console.log('[couponService] Deleting coupon from Firestore:', cleanCode);
  await runAdminFirestoreOp(async (activeDb) => {
    const docRef = doc(activeDb, 'coupons', cleanCode);
    await deleteDoc(docRef);
    console.log('[couponService] Coupon deleted successfully:', cleanCode);
  });
};

/**
 * Seed default coupons if none exist
 */
export const seedDefaultCoupons = async (): Promise<void> => {
  try {
    await runAdminFirestoreOp(async (activeDb) => {
      for (const c of DEFAULT_COUPONS) {
        const docRef = doc(activeDb, 'coupons', c.code);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, {
            ...c,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        } else {
          // Upgrade FIRST100 if it was saved with old isFirstOrderOnly rule
          const data = snap.data();
          if (c.code === 'FIRST100' && (data.isFirstOrderOnly || !data.maxOrderCount || data.perUserLimit === 1)) {
            await updateDoc(docRef, {
              description: c.description,
              isFirstOrderOnly: false,
              maxOrderCount: 3,
              perUserLimit: 3,
              updatedAt: Timestamp.now(),
            });
          }
        }
      }
    });
  } catch (err) {
    console.warn('[couponService] Could not auto-seed default coupons:', err);
  }
};
