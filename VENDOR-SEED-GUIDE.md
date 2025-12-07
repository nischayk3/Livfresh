# 🌱 Vendor Seed Guide

This guide will help you seed vendor data to your Firestore database.

## Step 1: Update Firestore Security Rules

Before seeding, make sure your Firestore security rules allow writes to the `vendors` collection. For testing purposes, you can temporarily use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads/writes for testing (CHANGE IN PRODUCTION!)
    match /vendors/{vendorId} {
      allow read, write: if true;
      
      match /services/{serviceId} {
        allow read, write: if true;
      }
    }
    
    // Users collection
    match /users/{userId} {
      allow create, read, update: if true;
    }
  }
}
```

**⚠️ IMPORTANT:** These rules are for testing only. Update them for production!

## Step 2: Seed Vendors

### Option 1: Using React Native (Recommended)

Create a temporary screen or button in your app to trigger the seed:

```typescript
import { seedVendors } from '../services/vendorSeed';

// In your component
const handleSeed = async () => {
  try {
    const result = await seedVendors();
    Alert.alert('Success', `Seeded ${result.count} vendors!`);
  } catch (error) {
    Alert.alert('Error', 'Failed to seed vendors');
  }
};
```

### Option 2: Using Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **livfresh**
3. Go to **Firestore Database** → **Data** tab
4. For each vendor in `src/services/vendorSeed.ts`:
   - Click **Start collection** (if first vendor) or **Add document**
   - Collection ID: `vendors`
   - Document ID: Use the `id` from vendor data (e.g., `vendor_btm_1`)
   - Add fields:
     - `name` (string)
     - `phone` (string)
     - `address` (string)
     - `area` (string): 'BTM' or 'JP Nagar'
     - `rating` (number)
     - `totalRatings` (number)
     - `imageUrl` (string)
     - `active` (boolean): true
     - `timings` (map):
       - `open` (string): '08:00'
       - `close` (string): '20:00'
     - `deliveryTime` (string): '2-3 hours'
     - `minOrder` (number)
     - `createdAt` (timestamp)
     - `updatedAt` (timestamp)
   
5. For each vendor's services:
   - Click **Start subcollection** under the vendor document
   - Collection ID: `services`
   - For each service (wash_fold, wash_iron, blanket_wash):
     - Document ID: Use service `id` (e.g., `wash_fold`)
     - Add fields:
       - `name` (string)
       - `description` (string)
       - `pricePerUnit` (number)
       - `unit` (string): 'kg' or 'piece'
       - `available` (boolean): true
       - `createdAt` (timestamp)

## Step 3: Verify Data

After seeding, verify in Firebase Console:
- 8 vendor documents in `/vendors` collection
- Each vendor has 3 service documents in `/vendors/{vendorId}/services`

## Vendor List

### BTM Area (4 vendors):
1. **Fresh Clean Laundry** - `vendor_btm_1`
2. **Quick Wash Express** - `vendor_btm_2`
3. **Spotless Laundry Hub** - `vendor_btm_3`
4. **Clean & Care Laundry** - `vendor_btm_4`

### JP Nagar Area (4 vendors):
1. **Premium Laundry Services** - `vendor_jpnagar_1`
2. **Express Laundry Point** - `vendor_jpnagar_2`
3. **Smart Wash Laundry** - `vendor_jpnagar_3`
4. **Eco Clean Laundry** - `vendor_jpnagar_4`

## Services Offered

Each vendor offers:
- **Wash & Fold** - Regular wash and fold service
- **Wash & Iron** - Wash, dry, and iron service
- **Blanket Wash** - Professional blanket cleaning

## Next Steps

After seeding:
1. Update Firestore security rules for production
2. Test vendor listing in the app
3. Test vendor detail screen
4. Test service selection flow

---

**Need Help?** Check the `src/services/vendorSeed.ts` file for the complete data structure.


