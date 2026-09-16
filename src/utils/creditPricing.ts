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
export type CreditWeight = 7 | 14;

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
  /** Kg per credit (7 or 14). */
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
 * Every consumer (BuyCreditsScreen, admin panel, store) must call this
 * to ensure consistent pricing.
 */
export function computePrice(
  serviceType: ServiceType,
  kgPerCredit: CreditWeight,
  creditCount: number,
): PriceBreakdown {
  const ratePerKg = RATE_TABLE[serviceType][creditCount];
  const pricePerCredit = ratePerKg * kgPerCredit;
  const totalAmount = pricePerCredit * creditCount;
  const normalTotal = NORMAL_RATE[serviceType] * kgPerCredit * creditCount;
  const savingsVsNormal = normalTotal - totalAmount;
  const savingsPercent = Math.round((savingsVsNormal / normalTotal) * 100);

  return {
    ratePerKg,
    kgPerCredit,
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