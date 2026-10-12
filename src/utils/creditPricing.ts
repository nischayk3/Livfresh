// ── Credit pricing model ──────────────────────────────────────────
//
// Rates are PER KG.  Total = ratePerKg × kgPerCredit × creditCount.
// Volume discount: the per-kg rate drops as you buy more credits.
//
// Normal (pay-per-order) baseline:
//   Wash & Fold = ₹85/kg   (src/screens/Main/ServiceDetailScreen.tsx)
//   Wash & Iron = ₹140/kg
// Savings vs normal is the volume discount spread on every kg.

export type ServiceType = 'wash_fold' | 'wash_iron';
export type CreditWeight = 7;

/** Per-kg rate for a given service and credit bundle size. */
export const RATE_TABLE: Record<ServiceType, Record<number, number>> = {
  wash_fold: {
    2: 80,
    3: 75,
    4: 70,
  },
  wash_iron: {
    2: 135,
    3: 130,
    4: 125,
  },
};

/** Normal (pay-per-order) per-kg baseline for savings calculation. */
export const NORMAL_RATE: Record<ServiceType, number> = {
  wash_fold: 85,
  wash_iron: 140,
};

/** Supported credit-bundle sizes. */
export const CREDIT_OPTIONS = [2, 3, 4] as const;

export interface PriceBreakdown {
  /** Rate per kg for this bundle (e.g. 75 for 3-pack W&F). */
  ratePerKg: number;
  /** Kg per credit (standardized to 7kg). */
  kgPerCredit: CreditWeight;
  /** Number of credits. */
  creditCount: number;
  /** Base price per credit (ratePerKg × kgPerCredit). */
  pricePerCredit: number;
  /** Total price (pricePerCredit × creditCount). */
  totalAmount: number;
  /** How much this saves over paying per order at normal rates. */
  savingsVsNormal: number;
  /** Percentage saved vs normal. */
  savingsPercent: number;
}

/**
 * Compute full price breakdown for a given service, weight, and credits.
 * Standardized to 7kg per credit.
 */
export function computePrice(
  serviceType: ServiceType,
  kgPerCredit: CreditWeight = 7,
  creditCount: number = 2,
): PriceBreakdown {
  const ratePerKg = RATE_TABLE[serviceType][creditCount] ?? (serviceType === 'wash_iron' ? 130 : 80);
  const pricePerCredit = ratePerKg * 7;
  const totalAmount = pricePerCredit * creditCount;
  const normalTotal = NORMAL_RATE[serviceType] * 7 * creditCount;
  const savingsVsNormal = normalTotal - totalAmount;
  const savingsPercent = Math.round((savingsVsNormal / normalTotal) * 100);

  return {
    ratePerKg,
    kgPerCredit: 7,
    creditCount,
    pricePerCredit,
    totalAmount,
    savingsVsNormal,
    savingsPercent,
  };
}

/** Friendly label for a service type. */
export function serviceTypeLabel(type: ServiceType): string {
  return type === 'wash_fold' ? 'Wash & Fold' : 'Wash & Iron';
}

/**
 * Per-kg rate for weight that falls outside a credit's allowance.
 *
 * The customer keeps the rate they locked in when they bought the pack (e.g. ₹80/kg, ₹75/kg, ₹70/kg
 * for Wash & Fold, or ₹135/kg, ₹130/kg, ₹125/kg for Wash & Iron).
 * If ratePerKg is missing on legacy orders, we fall back to the subscription baseline rate
 * (₹80 for Wash & Fold, ₹130 for Wash & Iron) — NEVER the walk-in rate (₹85/₹140).
 */
export function excessKgRate(
  serviceType: ServiceType,
  ratePerKg?: number | null,
): number {
  if (ratePerKg && ratePerKg > 0) {
    return ratePerKg;
  }
  return serviceType === 'wash_iron' ? 130 : 80;
}