/**
 * Central registry of static app asset URLs hosted on Firebase Storage CDN.
 *
 * All images are WebP format (compressed from PNG, ~95% size reduction).
 * Cache-Control: public, max-age=31536000 (1 year) set on all files.
 *
 * Bucket: spin-it-a135a.firebasestorage.app
 * Path prefix: app_assets/
 */

export const ASSET_URLS = {
  // Onboarding slides
  onboarding_screen_1: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fonboarding_screen_1.webp?alt=media&token=79b1c985-9627-473d-b345-5f766cf8a0e2',
  onboarding_screen_2: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fonboarding_screen_2.webp?alt=media&token=9a38707e-ab44-481e-aa27-02c536efaa3b',
  onboarding_pickup_v2: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fonboarding_pickup_v2.webp?alt=media&token=3342cc6b-bd8b-4da4-ad25-61c26523440f',

  // Promo banners (HomeScreen carousel)
  banner_offer_3d: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fbanner_offer_3d.webp?alt=media&token=9c744a35-ab16-4b94-8401-ece8ad15d26a',
  banner_delivery_3d: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fbanner_delivery_3d.webp?alt=media&token=ddba0201-cb63-494b-b2ce-828a0ce3f5af',
  banner_relax_3d: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fbanner_relax_3d.webp?alt=media&token=e906b3f5-c678-4bd6-9560-8e792025661d',

  // Service card images (HomeScreen grid)
  services_wash_fold: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fservices%2Fwash_fold.webp?alt=media&token=418f7427-30cc-4e8a-9e71-784150cd6f07',
  services_ironing: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fservices%2Fironing.webp?alt=media&token=03cfcf17-f75b-414b-a626-5c7f37a91b9f',
  services_blanket_wash: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fservices%2Fblanket_wash.webp?alt=media&token=2f96a889-a050-41b2-9d31-ebf664088460',
  services_wash_iron: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fservices%2Fwash_iron.webp?alt=media&token=0eb42828-9e6a-49e0-9d06-1ca042befa00',

  // Illustrations
  subscription_illustration: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fsubscription_illustration.webp?alt=media&token=5d959158-651b-471e-8db5-c6cdcb05d2ec',
  location_illustration: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Flocation_illustration.webp?alt=media&token=258b17a0-54ca-463a-8cb3-d04f4994c4f2',

  // Video
  process_video: 'https://firebasestorage.googleapis.com/v0/b/spin-it-a135a.firebasestorage.app/o/app_assets%2Fprocess_video.mp4?alt=media&token=bd67b887-5f71-480b-a89d-7380742d9602',
} as const;
