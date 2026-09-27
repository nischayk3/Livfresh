# Premium Laundry & Shoe Cleaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two orderable services — Premium Laundry (₹200/kg, min 5kg) and Shoe Cleaning (₹300/item across 3 categories) — with service-detail sheets, full cart/order/admin integration, matching existing patterns.

**Architecture:** Rewrite two existing stubbed render functions in `ServiceDetailScreen.tsx`, add the two service keys to the availability store (which auto-wires admin toggles), add two home-screen tiles, and add two pricing cases in the admin order screen. No schema migration (Firestore is schemaless). No credits/subscription changes.

**Tech Stack:** Expo SDK 54, React Native 0.81, Zustand, Firebase, NativeWind.

---

## File Map

- `src/store/serviceAvailabilityStore.ts` — add `premium_laundry` + `shoe_clean` keys, defaults, labels.
- `src/screens/Main/HomeScreen.tsx` — add 2 tiles to `SERVICES` + 1 new `bentoRow`.
- `src/screens/Main/ServiceDetailScreen.tsx` — rewrite `renderPremiumLaundry()` and `renderShoeCleaning()`, add FAQ arrays, `calculateTotal()` + `handleAddToCart` branches, image map entries.
- `src/utils/assetUrls.ts` — add `services_premium_laundry` + `services_shoe_clean` URLs.
- `src/screens/Admin/AdminOrdersScreen.tsx` — add 2 pricing cases in `calculateItemPrice()`.
- `src/store/cartStore.ts` — add optional `shoeItems`, `shoeSubtotal`, `deliveryFee` fields to `CartItem`.

---

## Task 1: Availability store keys

**Files:**
- Modify: `src/store/serviceAvailabilityStore.ts:12` (interface), `:19` (defaults), `:96` (labels)

- [ ] **Step 1: Add keys to interface and defaults**

In `ServiceAvailability` interface add `premium_laundry: boolean;` and `shoe_clean: boolean;`. In `DEFAULT_AVAILABILITY` add `premium_laundry: true,` and `shoe_clean: true,`.

- [ ] **Step 2: Add labels**

In `SERVICE_LABELS` add:
```ts
premium_laundry: 'Premium Laundry',
shoe_clean: 'Shoe Cleaning',
```

- [ ] **Step 3: Update fetchAvailability to read new fields**

In `fetchAvailability`, add `premium_laundry: data.premium_laundry ?? true,` and `shoe_clean: data.shoe_clean ?? true,`.

- [ ] **Step 4: Commit**

```bash
git add src/store/serviceAvailabilityStore.ts
git commit -m "feat(services): add premium_laundry and shoe_clean availability keys"
```

---

## Task 2: Asset URLs

**Files:**
- Modify: `src/utils/assetUrls.ts:23-26`

- [ ] **Step 1: Add two URL constants**

After `services_wash_iron`, add:
```ts
services_premium_laundry: 'PLACEHOLDER_PREMIUM_URL',
services_shoe_clean: 'PLACEHOLDER_SHOE_URL',
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/assetUrls.ts
git commit -m "feat(services): add premium laundry and shoe cleaning asset url keys"
```

---

## Task 3: CartItem fields

**Files:**
- Modify: `src/store/cartStore.ts:19`

- [ ] **Step 1: Add shoe fields**

After `dryCleanItems`, add:
```ts
shoeItems?: { type: string; name: string; quantity: number; price: number }[];
shoeSubtotal?: number;
deliveryFee?: number;
```

- [ ] **Step 2: Commit**

```bash
git add src/store/cartStore.ts
git commit -m "feat(cart): add shoe item and delivery fee fields"
```

---

## Task 4: HomeScreen tiles

**Files:**
- Modify: `src/screens/Main/HomeScreen.tsx:108-113`

- [ ] **Step 1: Add two SERVICES entries before `subscription`**

```ts
{
  id: 'premium_laundry',
  name: 'Premium Laundry',
  image: { uri: ASSET_URLS.services_premium_laundry },
  gradient: ['#FDF2F8', '#FCE7F3'] as [string, string],
},
{
  id: 'shoe_clean',
  name: 'Shoe Cleaning',
  image: { uri: ASSET_URLS.services_shoe_clean },
  gradient: ['#ECFEFF', '#CFFAFE'] as [string, string],
},
```

- [ ] **Step 2: Add a third bentoRow after the existing Row 2 block (after line ~536)**

Copy the Row 2 `<View style={styles.bentoRow}>...</View>` structure and render `[SERVICES[4], SERVICES[5]]`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Main/HomeScreen.tsx
git commit -m "feat(home): add premium laundry and shoe cleaning tiles"
```

---

## Task 5: ServiceDetailScreen — Premium Laundry + Shoe Cleaning

**Files:**
- Modify: `src/screens/Main/ServiceDetailScreen.tsx`

- [ ] **Step 1: Add FAQ arrays (near line 72, after `IRONING_FAQS`)**

```ts
const PREMIUM_LAUNDRY_FAQS = [
  { question: "What kind of clothes should I give to Premium Laundry?", answer: "Premium or high-value clothing, delicate garments, branded clothing, or clothes you want handled with extra care." },
  { question: "What is the difference between Premium Laundry and Wash & Fold?", answer: "Premium Laundry includes extra pre-stain treatment, colour-wise separation, separate washing of whites and coloured clothes, professional ironing and premium packaging." },
  { question: "Are white clothes washed separately?", answer: "Yes. White/light-coloured clothes are separated from darker and coloured garments before washing." },
  { question: "Will my clothes be tagged individually?", answer: "Yes. Clothes are tagged during processing to help maintain proper sorting and order tracking." },
  { question: "Does Premium Laundry include ironing?", answer: "Yes. Premium Laundry already includes professional ironing. There is no separate ironing option inside this service." },
  { question: "Will you treat stains before washing?", answer: "Yes. Our team performs pre-stain treatment before the main wash where appropriate." },
  { question: "How are my clothes packaged?", answer: "After washing, drying and ironing, the clothes are neatly packed and placed in premium packaging before delivery." },
  { question: "Is Premium Laundry suitable for very delicate clothes?", answer: "It is designed for higher-care garments, but special-care instructions, fabric labels and garment condition are checked before processing." },
  { question: "How is Premium Laundry different from regular Wash & Iron?", answer: "Premium Laundry adds an extra-care process including pre-stain treatment, colour separation, separate white washing and premium packaging." },
  { question: "How is Premium Laundry priced?", answer: "₹200/kg with a minimum order of 5 kg." },
];

const SHOE_CLEAN_FAQS = [
  { question: "What types of shoes can I get cleaned?", answer: "Canvas and sports shoes, crocs and sandals, and slippers. Leather shoe cleaning is coming soon." },
  { question: "Is the ₹300 rate per pair?", answer: "Yes, each pair/item is ₹300." },
  { question: "Is leather shoe cleaning available?", answer: "Not yet — coming soon with a leather-safe cleaning process." },
  { question: "Is there a delivery fee?", answer: "A ₹50 pickup and delivery fee applies." },
  { question: "Do you remove stains or restore shoes?", answer: "We provide professional cleaning and surface stain treatment. It is not a restoration service." },
  { question: "How long does it take?", answer: "Most shoe cleaning orders are delivered within 24-48 hours." },
];
```

- [ ] **Step 2: Add premium + shoe branches to `calculateTotal()` (at line ~503)**

```ts
if (serviceId === 'premium_laundry') {
  return premiumWeight * 200;
}

if (serviceId === 'shoe_clean') {
  return calculateShoeSubtotal() + 50;
}
```

Add helper above `renderServiceContent`:
```ts
const SHOE_CATEGORIES = [
  { id: 'canvas_sports', name: 'Canvas & Sports Shoes' },
  { id: 'crocs_sandals', name: 'Crocs & Sandals' },
  { id: 'slippers', name: 'Slippers' },
];

const calculateShoeSubtotal = () =>
  SHOE_CATEGORIES.reduce((sum, c) => sum + (shoeSelections[c.id] || 0) * 300, 0);
```

- [ ] **Step 3: Rewrite the premium branch in `handleAddToCart` (replace lines 636-641)**

```ts
if (serviceId === 'premium_laundry') {
  cartItem.weight = premiumWeight || 5;
  cartItem.clothesCount = Math.round((premiumWeight || 5) * 3.5);
  cartItem.ironingEnabled = true;
  cartItem.ironingCount = Math.round((premiumWeight || 5) * 3.5);
  cartItem.ironingPrice = 0;
  cartItem.deliveryFee = 0;
}

if (serviceId === 'shoe_clean') {
  cartItem.shoeItems = SHOE_CATEGORIES
    .filter((c) => (shoeSelections[c.id] || 0) > 0)
    .map((c) => ({
      type: c.id,
      name: c.name,
      quantity: shoeSelections[c.id],
      price: 300,
    }));
  cartItem.shoeSubtotal = calculateShoeSubtotal();
  cartItem.deliveryFee = 50;
  cartItem.description = cartItem.shoeItems.map((s) => `${s.name} ×${s.quantity}`).join(', ');
}
```

- [ ] **Step 4: Rewrite `renderPremiumLaundry()` (replace lines 1172-1263)**

```ts
const renderPremiumLaundry = () => (
  <View>
    <View style={styles.section}>
      <ServiceStats rating={4.8} reviewCount={900} />
      <Text style={styles.sectionTitle}>Premium Laundry</Text>
      <Text style={styles.premiumSelectorSubtitle}>Extra-care wash & iron for high-value clothes</Text>
      <Text style={styles.premiumSelectorSubtitle}>
        Recommended for high-value, delicate or premium clothing that needs extra care.
      </Text>

      <View style={styles.counterWrapper}>
        <TouchableOpacity
          style={[styles.countBtn, (premiumWeight || 5) <= 5 && styles.countBtnDisabled]}
          onPress={() => setPremiumWeight(Math.max(5, (premiumWeight || 5) - 1))}
          disabled={(premiumWeight || 5) <= 5}
        >
          <MaterialCommunityIcons name="minus" size={24} color={(premiumWeight || 5) <= 5 ? '#CBD5E1' : '#7C3AED'} />
        </TouchableOpacity>
        <View style={styles.countDisplay}>
          <Text style={styles.countText}>{premiumWeight || 5}</Text>
          <Text style={styles.countLabel}>KG</Text>
        </View>
        <TouchableOpacity
          style={[styles.countBtn, (premiumWeight || 5) >= 50 && styles.countBtnDisabled]}
          onPress={() => setPremiumWeight(Math.min(50, (premiumWeight || 5) + 1))}
          disabled={(premiumWeight || 5) >= 50}
        >
          <MaterialCommunityIcons name="plus" size={24} color={(premiumWeight || 5) >= 50 ? '#CBD5E1' : '#7C3AED'} />
        </TouchableOpacity>
      </View>
      <Text style={styles.premiumSelectorSubtitle}>Min 5 kg • ~{Math.round((premiumWeight || 5) * 3.5)} clothes • ₹200/kg • Ironing included</Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What's Included</Text>
      {[
        'Pre-stain treatment', 'Colour-wise separation', 'Whites washed separately',
        'Premium wash & drying', 'Professional ironing', 'Premium packaging', 'Secure delivery',
      ].map((line) => (
        <View key={line} style={styles.divider} />
      ))}
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How It Works</Text>
      <Text style={styles.premiumSelectorSubtitle}>
        Pickup → Pre-Stain → Tagging → Colour Separation → Separate Wash → Dry → Iron → Premium Packaging → Deliver
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
      <Text style={styles.premiumSelectorSubtitle}>
        Add any notes for high-value or delicate garments, fabric care, etc.
      </Text>
      <TextInput
        style={styles.instructionsInput}
        placeholder="Add any notes for stains, fabric care, perfume, etc..."
        placeholderTextColor={COLORS.textLight}
        multiline
        numberOfLines={4}
        value={premiumSpecialInstructions}
        onChangeText={setPremiumSpecialInstructions}
      />
      {renderMediaButtons()}
      {renderPhotoGallery()}
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>FAQs</Text>
      <FaqAccordion items={PREMIUM_LAUNDRY_FAQS} />
    </View>
  </View>
);
```

- [ ] **Step 5: Rewrite `renderShoeCleaning()` entirely (replace lines 1060-1104)**

```ts
const renderShoeCleaning = () => {
  const shoeSubtotal = calculateShoeSubtotal();
  return (
    <View>
      <View style={styles.section}>
        <ServiceStats rating={4.7} reviewCount={800} />
        <Text style={styles.sectionTitle}>Select Items</Text>
        <Text style={styles.premiumSelectorSubtitle}>
          Professional shoe cleaning for everyday footwear, with material-specific cleaning and care.
        </Text>
        {SHOE_CATEGORIES.map((shoe) => (
          <View key={shoe.id} style={styles.blanketRow}>
            <View style={styles.blanketInfo}>
              <Text style={styles.blanketOptionText}>{shoe.name}</Text>
              <Text style={styles.blanketPrice}>₹300 / item</Text>
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setShoeSelections({
                  ...shoeSelections,
                  [shoe.id]: Math.max(0, (shoeSelections[shoe.id] || 0) - 1),
                })}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{shoeSelections[shoe.id] || 0}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonActive]}
                onPress={() => setShoeSelections({
                  ...shoeSelections,
                  [shoe.id]: (shoeSelections[shoe.id] || 0) + 1,
                })}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Subtotal</Text>
          <Text style={styles.billValue}>₹{shoeSubtotal}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Pickup & Delivery</Text>
          <Text style={styles.billValue}>₹50</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Total</Text>
          <Text style={styles.billValue}>₹{shoeSubtotal + 50}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's Included</Text>
        {[
          'Material-specific cleaning', 'Surface stain treatment', 'Deep cleaning',
          'Drying', 'Finishing & inspection',
        ].map((line) => (
          <View key={line} style={styles.divider} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.premiumSelectorSubtitle}>
          Pickup → Inspection → Cleaning → Drying → Finishing → Delivery
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Add any notes..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
        />
        {renderMediaButtons()}
        {renderPhotoGallery()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAQs</Text>
        <FaqAccordion items={SHOE_CLEAN_FAQS} />
      </View>
    </View>
  );
};
```

- [ ] **Step 6: Replace the shoe placeholder in the main dispatch (line 1393-1398)**

Replace:
```tsx
{serviceId === 'shoe_clean' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Shoe Cleaning Options</Text>
    <Text style={{ color: COLORS.textSecondary }}>Coming Soon</Text>
  </View>
)}
```
with:
```tsx
{serviceId === 'shoe_clean' && renderShoeCleaning()}
```

- [ ] **Step 7: Add premium/shoe to the ViewContent tracker name map (near line 130)**

```ts
else if (serviceId === 'premium_laundry') serviceName = 'Premium Laundry';
else if (serviceId === 'shoe_clean') serviceName = 'Shoe Cleaning';
```

- [ ] **Step 8: Add image map entries in `SERVICE_IMAGES` (near line 224)**

```ts
'premium_laundry': { uri: ASSET_URLS.services_premium_laundry },
'shoe_clean': { uri: ASSET_URLS.services_shoe_clean },
```

- [ ] **Step 9: Commit**

```bash
git add src/screens/Main/ServiceDetailScreen.tsx
git commit -m "feat(services): implement premium laundry and shoe cleaning detail flows"
```

---

## Task 6: Admin order pricing

**Files:**
- Modify: `src/screens/Admin/AdminOrdersScreen.tsx:2158`

- [ ] **Step 1: Add pricing cases before the default return**

In `calculateItemPrice`, after the `ironing` block and before `// Default fallback`:
```ts
if (item.serviceId === 'premium_laundry') {
  return (item.weight || 5) * 200;
}
if (item.serviceId === 'shoe_clean') {
  return (item.shoeSubtotal || 0) + (item.deliveryFee ?? 50);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Admin/AdminOrdersScreen.tsx
git commit -m "feat(admin): price premium laundry and shoe cleaning orders"
```

---

## Verification

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new type errors (note: pre-existing errors, if any, are out of scope).

- [ ] **Step 2: Confirm admin toggles appear**

`ALL_SERVICES` now yields 6 entries; `AdminSettingsScreen` renders all automatically.

## Out of scope
- Real SKU images (placeholder URLs; owner supplies).
- Leather shoe row (hidden, code-ready).
- Credits/subscription for these services.
