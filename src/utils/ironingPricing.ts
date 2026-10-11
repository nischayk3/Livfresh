/**
 * Steam Ironing tier pricing.
 *
 * Rates are published on the customer-facing price card, hosted at
 * ASSET_URLS.services_ironing_price_list. Keep the two in step.
 *
 *   Light  ₹10/pc — everyday garments
 *   Medium ₹30/pc — heavier & structured garments
 *   Heavy  ₹50/pc — designer, ethnic & bulky items
 *
 * Customers order by total piece count alone. The store reclassifies Medium and
 * Heavy at pickup from the admin order-edit screen, which adjusts the bill the
 * customer sees (all orders are paid at delivery, never prepaid).
 *
 * Items created before the tier fields existed carry no mediumCount/heavyCount,
 * so they resolve to all-Light and price exactly as they did before.
 */

export const IRONING_RATES = {
  light: 10,
  medium: 30,
  heavy: 50,
} as const;

export type IroningTier = keyof typeof IRONING_RATES;

export const IRONING_TIER_LABELS: Record<IroningTier, string> = {
  light: 'Light / Everyday',
  medium: 'Medium / Structured',
  heavy: 'Heavy / Designer',
};

export interface IroningBreakdown {
  light: number;
  medium: number;
  heavy: number;
  total: number;
  amount: number;
}

interface IroningTierCounts {
  ironingCount?: number;
  clothesCount?: number;
  mediumCount?: number;
  heavyCount?: number;
}

/**
 * Split an ironing item's pieces across the three tiers and price it.
 * Medium + heavy are clamped so they can never exceed the total piece count.
 */
export function getIroningBreakdown(item: IroningTierCounts): IroningBreakdown {
  const total = item.ironingCount || item.clothesCount || 0;
  const medium = Math.max(0, Math.min(item.mediumCount || 0, total));
  const heavy = Math.max(0, Math.min(item.heavyCount || 0, total - medium));
  const light = Math.max(0, total - medium - heavy);

  return {
    light,
    medium,
    heavy,
    total,
    amount:
      light * IRONING_RATES.light +
      medium * IRONING_RATES.medium +
      heavy * IRONING_RATES.heavy,
  };
}
