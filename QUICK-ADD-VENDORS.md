# ⚡ Quick Guide: Add Vendors to Firebase

## 🎯 Fastest Way: Update Rules & Use App

### 1. Fix Permissions (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **livfresh**
3. **Firestore Database** → **Rules**
4. **Replace with:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /vendors/{vendorId} {
      allow read, write: if true;
      match /services/{serviceId} {
        allow read, write: if true;
      }
    }
    match /users/{userId} {
      allow create, read, update: if true;
    }
  }
}
```

5. Click **Publish**

### 2. Seed via App (1 minute)

1. Run your app
2. Go to HomeScreen
3. Click **"Seed Vendors (Dev Only)"** button
4. Wait for success ✅
5. Refresh screen

**Done!** 🎉

---

## 📝 All 8 Vendors (Real Data from BTM & JP Nagar)

### BTM Area:
1. **The Fairy Land Fabricare** - Rating: 5.0 ⭐
2. **LAUNDRY LOUNGE** - Rating: 5.0 ⭐
3. **New Laundry Basket** - Rating: 5.0 ⭐
4. **Wash n Wear** - Rating: 4.4 ⭐ (Real: +919243080984)

### JP Nagar Area:
1. **Insta Laundromat** - Rating: 4.6 ⭐ (Real: +919632391003)
2. **Laundry Nest** - Rating: 4.5 ⭐ (Real: +919632220020)
3. **LaundroKart** - Rating: 4.7 ⭐ (Real: +918098570025)
4. **Ziptap Laundry** - Rating: 4.5 ⭐ (Real: +917204407562)

All vendors offer:
- Wash & Fold
- Wash & Iron
- Blanket Wash

---

**Need help?** Check `FIX-FIRESTORE-PERMISSIONS.md` for detailed steps.


