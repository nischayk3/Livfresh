# 🔥 Firestore Database Setup Guide

## Step 1: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **livfresh**
3. Click on **Firestore Database** in the left menu
4. Click **Create Database**
5. Choose **Production mode** (we'll set security rules)
6. Select region: **asia-south1** (recommended for India) or your preferred region
7. Click **Enable**

---

## Step 2: Set Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write only their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /addresses/{addressId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /orders/{orderId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Vendors readable by all authenticated users
    match /vendors/{vendorId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can write (you'll do this manually)
      
      match /services/{serviceId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
      
      match /orders/{orderId} {
        allow read: if request.auth != null;
        allow write: if false; // Only app can write (via server functions or admin)
      }
    }
  }
}
```

3. Click **Publish**

---

## Step 3: Create Vendor Document

1. Go to **Firestore Database** → **Data** tab
2. Click **Start collection**
3. Collection ID: `vendors`
4. Document ID: `vendor_1` (or click **Auto-ID** and use the generated ID)
5. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Clean Express Laundry` (or your vendor name) |
| `phone` | string | `+919988776655` (your vendor phone) |
| `address` | string | `456 Service Road, Bangalore` (your vendor address) |
| `active` | boolean | `true` |

6. Click **Save**

---

## Step 4: Create Services Subcollection

1. Click on the `vendor_1` document you just created
2. Click **Start collection** (this creates a subcollection)
3. Collection ID: `services`
4. Create 5 documents with these IDs and fields:

### Document 1: `wash_fold`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Wash & Fold` |
| `description` | string | `Regular wash and fold service` |
| `icon` | string | `🧺` |
| `pricePerUnit` | number | `50` |
| `unit` | string | `kg` |

### Document 2: `wash_iron`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Wash & Iron` |
| `description` | string | `Wash, dry, and iron service` |
| `icon` | string | `👕` |
| `pricePerUnit` | number | `100` |
| `unit` | string | `kg` |

### Document 3: `shoe_clean`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Shoe Cleaning` |
| `description` | string | `Professional shoe cleaning` |
| `icon` | string | `👟` |
| `pricePerUnit` | number | `200` |
| `unit` | string | `piece` |

### Document 4: `bag_clean`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Bag Cleaning` |
| `description` | string | `Bag and luggage cleaning` |
| `icon` | string | `👜` |
| `pricePerUnit` | number | `150` |
| `unit` | string | `piece` |

### Document 5: `dry_clean`
| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Dry Cleaning` |
| `description` | string | `Premium dry cleaning service` |
| `icon` | string | `🧥` |
| `pricePerUnit` | number | `300` |
| `unit` | string | `kg` |

---

## Step 5: Enable Phone Authentication

1. Go to **Authentication** in Firebase Console
2. Click **Get started** (if not already enabled)
3. Go to **Sign-in method** tab
4. Click on **Phone**
5. Toggle **Enable**
6. (Optional) Add test phone numbers for development
7. Click **Save**

---

## Step 6: Verify Structure

Your Firestore structure should look like this:

```
/vendors/vendor_1/
  - name: "Clean Express Laundry"
  - phone: "+919988776655"
  - address: "456 Service Road, Bangalore"
  - active: true
  
  /services/
    - wash_fold
    - wash_iron
    - shoe_clean
    - bag_clean
    - dry_clean
```

---

## ✅ Checklist

- [ ] Firestore Database created
- [ ] Security rules published
- [ ] Vendor document created (`/vendors/vendor_1/`)
- [ ] 5 service documents created (`/vendors/vendor_1/services/`)
- [ ] Phone Authentication enabled
- [ ] Test phone number added (optional)

---

## 🚨 Important Notes

1. **Vendor ID**: If you use a different vendor ID (not `vendor_1`), update it in the code
2. **Security Rules**: These rules allow authenticated users to read vendor data but only write their own user data
3. **Orders**: Orders will be created automatically by the app when users place orders
4. **Addresses**: User addresses will be created automatically when users add addresses

---

**Once you complete these steps, let me know and we'll continue building!** 🚀



