# 🔧 Fix Firestore Permissions - Add Vendors

## ❌ Problem
You're getting this error:
```
❌ Error seeding vendors: [FirebaseError: Missing or insufficient permissions.]
```

This happens because Firestore security rules are blocking writes to the `vendors` collection.

---

## ✅ Solution: Update Firestore Security Rules

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **livfresh**
3. Go to **Firestore Database** → **Rules** tab

### Step 2: Update Rules (Temporary for Testing)

**Replace your current rules with this:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow create, read, update: if true; // Testing only!
      
      match /addresses/{addressId} {
        allow read, write: if true;
      }
      
      match /orders/{orderId} {
        allow read, write: if true;
      }
    }
    
    // Vendors collection - Allow all for testing
    match /vendors/{vendorId} {
      allow read, write: if true; // ⚠️ Testing only! Change in production!
      
      match /services/{serviceId} {
        allow read, write: if true;
      }
      
      match /orders/{orderId} {
        allow read, write: if true;
      }
    }
  }
}
```

### Step 3: Click "Publish"

---

## 🎯 Option 1: Seed via App (After Fixing Rules)

1. **Update the rules** (see above)
2. **Run your app**
3. **Go to HomeScreen**
4. **Click "Seed Vendors (Dev Only)" button**
5. **Wait for success message**
6. **Refresh the screen**

---

## 🎯 Option 2: Add Vendors Manually (Recommended for Now)

Since app-based seeding requires permission changes, you can add vendors manually via Firebase Console:

### Step 1: Create Vendors Collection

1. Go to **Firestore Database** → **Data** tab
2. Click **Start collection**
3. Collection ID: `vendors`
4. Click **Next**

### Step 2: Add First Vendor

**Document ID:** `vendor_btm_1`

Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `The Fairy Land Fabricare` |
| `phone` | string | `+919876543210` |
| `address` | string | `BTM Layout, 2nd Stage, Bangalore - 560068` |
| `area` | string | `BTM` |
| `rating` | number | `5.0` |
| `totalRatings` | number | `312` |
| `imageUrl` | string | `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400` |
| `active` | boolean | `true` |
| `deliveryTime` | string | `48 hours` |
| `minOrder` | number | `100` |
| `timings` | map | (see below) |

**For `timings` field:**
- Click **Add field** → Type: **map**
- Add:
  - `open` (string): `08:00`
  - `close` (string): `20:00`

### Step 3: Add Services Subcollection

1. Click on the `vendor_btm_1` document
2. Click **Start collection**
3. Collection ID: `services`

**Add 3 service documents:**

#### Service 1: `wash_fold`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Wash & Fold` |
| `description` | string | `Regular wash and fold service` |
| `pricePerUnit` | number | `50` |
| `unit` | string | `kg` |
| `available` | boolean | `true` |

#### Service 2: `wash_iron`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Wash & Iron` |
| `description` | string | `Wash, dry, and iron service` |
| `pricePerUnit` | number | `100` |
| `unit` | string | `kg` |
| `available` | boolean | `true` |

#### Service 3: `blanket_wash`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Blanket Wash` |
| `description` | string | `Professional blanket cleaning` |
| `pricePerUnit` | number | `200` |
| `unit` | string | `piece` |
| `available` | boolean | `true` |

### Step 4: Repeat for All 8 Vendors

Use the data from `src/services/vendorSeed.ts` to add all vendors. Here's a quick reference:

**BTM Vendors:**
- `vendor_btm_1` - The Fairy Land Fabricare
- `vendor_btm_2` - LAUNDRY LOUNGE
- `vendor_btm_3` - New Laundry Basket
- `vendor_btm_4` - Wash n Wear

**JP Nagar Vendors:**
- `vendor_jpnagar_1` - Insta Laundromat
- `vendor_jpnagar_2` - Laundry Nest
- `vendor_jpnagar_3` - LaundroKart
- `vendor_jpnagar_4` - Ziptap Laundry

---

## 📋 Quick Copy-Paste Data

I've created a JSON file with all vendor data. Check `src/services/vendorSeed.ts` for the complete structure.

---

## ✅ After Adding Vendors

1. **Refresh your app**
2. **Vendors should appear on HomeScreen**
3. **Click on a vendor to see details**
4. **Click on a service to proceed**

---

## 🚨 Important Notes

1. **Security Rules**: The rules above are for **testing only**. Update them for production:
   ```javascript
   match /vendors/{vendorId} {
     allow read: if true; // Anyone can read
     allow write: if false; // Only admins can write
   }
   ```

2. **Phone Numbers**: Some phone numbers in the seed data are placeholders. Replace with actual numbers if needed.

3. **Images**: Currently using Unsplash placeholder images. Replace with actual vendor images later.

---

## 🎉 Done!

Once you've added vendors (either via app or manually), they'll appear in your HomeScreen! 🚀


