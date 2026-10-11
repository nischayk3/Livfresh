const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../spin-it-a135a-firebase-adminsdk-fbsvc-bff41b4927.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Exact operational service polygon from src/utils/geofence.ts
const NEW_MAP_POLYGON = [
  { latitude: 12.894226891, longitude: 77.599241985 },
  { latitude: 12.899455983, longitude: 77.60076548 },
  { latitude: 12.9022169, longitude: 77.601194633 },
  { latitude: 12.905417016, longitude: 77.601838363 },
  { latitude: 12.907560861, longitude: 77.600465072 },
  { latitude: 12.911953077, longitude: 77.599912534 },
  { latitude: 12.920298065, longitude: 77.600191484 },
  { latitude: 12.932093512, longitude: 77.600620638 },
  { latitude: 12.936527118, longitude: 77.601736437 },
  { latitude: 12.944453038, longitude: 77.602723488 },
  { latitude: 12.943992965, longitude: 77.607487092 },
  { latitude: 12.943700192, longitude: 77.630575547 },
  { latitude: 12.938597502, longitude: 77.63276423 },
  { latitude: 12.920486294, longitude: 77.655681024 },
  { latitude: 12.905866705, longitude: 77.654393562 },
  { latitude: 12.90350323, longitude: 77.64999474 },
  { latitude: 12.90350323, longitude: 77.648728738 },
  { latitude: 12.899612858, longitude: 77.648728738 },
  { latitude: 12.899320032, longitude: 77.645166765 },
  { latitude: 12.896559083, longitude: 77.645424257 },
  { latitude: 12.893839937, longitude: 77.644866358 },
  { latitude: 12.892292103, longitude: 77.644866358 },
  { latitude: 12.891999268, longitude: 77.64411534 },
  { latitude: 12.890702424, longitude: 77.64411534 },
  { latitude: 12.889238238, longitude: 77.640210043 },
  { latitude: 12.8925431, longitude: 77.59892012 },
  { latitude: 12.894226891, longitude: 77.599241985 }
];

// Standalone pockets served outside the main polygon, from src/utils/geofence.ts
const EXTRA_SERVICE_AREAS = [
  {
    id: 'nischay_home',
    name: 'Nischay Home',
    ring: [
      { latitude: 12.883565086, longitude: 77.614182565 },
      { latitude: 12.883206874, longitude: 77.614012245 },
      { latitude: 12.882980703, longitude: 77.614751193 },
      { latitude: 12.883406897, longitude: 77.614874575 },
      { latitude: 12.883565086, longitude: 77.614182565 }
    ]
  }
];

const SERVICE_EDGE_TOLERANCE_METERS = 15;
const METERS_PER_DEGREE_LAT = 111320;

function distanceToSegmentMeters(point, a, b) {
  const lngScale = METERS_PER_DEGREE_LAT * Math.cos((point.latitude * Math.PI) / 180);
  const px = (point.longitude - a.longitude) * lngScale;
  const py = (point.latitude - a.latitude) * METERS_PER_DEGREE_LAT;
  const bx = (b.longitude - a.longitude) * lngScale;
  const by = (b.latitude - a.latitude) * METERS_PER_DEGREE_LAT;
  const lengthSq = bx * bx + by * by;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq));
  return Math.hypot(px - bx * t, py - by * t);
}

function isPointInPolygon(point, polygon) {
  if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') return false;
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  if (inside) return true;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (distanceToSegmentMeters(point, polygon[j], polygon[i]) <= SERVICE_EDGE_TOLERANCE_METERS) return true;
  }
  return false;
}

function isLocationServiceable(location) {
  if (isPointInPolygon(location, NEW_MAP_POLYGON)) return true;
  return EXTRA_SERVICE_AREAS.some((area) => isPointInPolygon(location, area.ring));
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return '"' + str + '"';
}

async function runExport() {
  console.log('Fetching Firestore collections...');
  const usersSnap = await db.collection('users').get();
  const ordersSnap = await db.collectionGroup('orders').get();
  const unservSnap = await db.collection('unserviceable_requests').get();

  const userOrders = {};
  ordersSnap.forEach(d => {
    const data = d.data();
    const u = data.userId;
    if (u) {
      if (!userOrders[u]) userOrders[u] = [];
      userOrders[u].push({ id: d.id, ...data });
    }
  });

  const unservByUser = {};
  unservSnap.forEach(d => {
    const data = d.data();
    if (data.userId) {
      if (!unservByUser[data.userId]) unservByUser[data.userId] = [];
      const ts = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : null;
      unservByUser[data.userId].push({ id: d.id, ...data, _timestamp: ts });
    }
  });

  const allCohort = [];
  const abandonedCartUsers = [];

  usersSnap.forEach(doc => {
    const d = doc.data();
    const createdAt = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : null;
    const updatedAt = d.updatedAt ? (d.updatedAt.toDate ? d.updatedAt.toDate() : new Date(d.updatedAt)) : null;

    // Last Wednesday (Sept 16) to Wednesday (Sept 23) and past 12 days (Sept 14 - Sept 26)
    const isOnboardedTarget = createdAt && createdAt >= new Date('2026-09-14T00:00:00Z');
    const isCartActiveTarget = Array.isArray(d.activeCart) && d.activeCart.length > 0 && updatedAt && updatedAt >= new Date('2026-09-14T00:00:00Z');

    if (isOnboardedTarget || isCartActiveTarget) {
      const orders = userOrders[doc.id] || [];
      const hasOrder = orders.length > 0;
      const unservs = unservByUser[doc.id] || [];
      const hasCart = Array.isArray(d.activeCart) && d.activeCart.length > 0;
      const savedAddrs = Array.isArray(d.savedAddresses) ? d.savedAddresses : [];

      let primaryAddr = '';
      let addrLat = null;
      let addrLng = null;

      if (unservs.length > 0) {
        primaryAddr = unservs[0].address || '';
        addrLat = unservs[0].location?.latitude;
        addrLng = unservs[0].location?.longitude;
      } else if (savedAddrs.length > 0) {
        primaryAddr = savedAddrs[0].address || '';
        addrLat = savedAddrs[0].latitude;
        addrLng = savedAddrs[0].longitude;
      }

      let isServiceable = false;
      if (addrLat && addrLng) {
        isServiceable = isLocationServiceable({ latitude: addrLat, longitude: addrLng });
      }

      // Format cart details
      let cartItemsSummary = '';
      let cartTotal = 0;
      if (hasCart) {
        cartItemsSummary = d.activeCart.map(item => {
          let desc = item.serviceName || item.serviceType || 'Service';
          if (item.weight) desc += ' (' + item.weight + 'kg)';
          if (item.clothesCount) desc += ' (' + item.clothesCount + ' pcs)';
          if (item.ironingCount) desc += ' + Ironing (' + item.ironingCount + ' pcs)';
          if (item.blanketQuantity) desc += ' (' + item.blanketQuantity + ' blankets)';
          if (item.singleBlanketCount) desc += ' (' + item.singleBlanketCount + ' single)';
          if (item.doubleBlanketCount) desc += ' (' + item.doubleBlanketCount + ' double)';
          const price = Number(item.totalPrice || item.basePrice || 0);
          desc += ' - ₹' + price;
          cartTotal += price;
          return desc;
        }).join('; ');
      }

      // Categorization & Actionable Script
      let category = '';
      let callingAction = '';

      if (hasOrder) {
        category = 'Converted: Placed Order';
        callingAction = 'Delighted Customer Follow-up / NPS check';
      } else if (hasCart) {
        if (unservs.length > 0) {
          category = 'Blocked: Out of Area (Explicitly Tried In App)';
          callingAction = 'Area Expansion Follow-up: Apologize for boundary limit, note exact apartment demand, offer to notify when area opens or schedule special manual pickup.';
        } else if (savedAddrs.length > 0 && !isServiceable) {
          category = 'Blocked: Out of Area (Saved Address Outside)';
          callingAction = 'Location Check: Customer saved address outside active zone and added to cart. Check if they have an alternate address (e.g. office in HSR/Koramangala) or record area.';
        } else if (savedAddrs.length > 0 && isServiceable) {
          category = 'HIGH PRIORITY: Serviceable Abandoned Cart (HOT LEAD)';
          callingAction = 'Direct Sales Closing: Customer is inside our service zone and has items in cart! Ask if they need help scheduling a slot, have special fabric questions, or offer welcome discount.';
        } else {
          category = 'Medium Priority: Added to Cart, No Address';
          callingAction = 'Assisted Checkout: Added items to cart but dropped before address entry. Help confirm address & schedule first pickup.';
        }
      } else {
        if (savedAddrs.length > 0) {
          category = 'Browsed & Saved Address (No Items in Cart)';
          callingAction = 'Service Introduction: Added address during onboarding. Introduce current rates & turnaround time, ask about laundry needs.';
        } else {
          category = 'Registered Only (Dropped at Onboarding)';
          callingAction = 'Welcome check: Dropped off after OTP verification. Check if app navigation was intuitive.';
        }
      }

      const record = {
        userId: doc.id,
        name: d.name || 'Customer',
        phone: d.phone || '',
        email: d.email || '',
        gender: d.gender || '',
        registeredDate: createdAt ? createdAt.toISOString().replace('T', ' ').slice(0, 19) : '',
        lastActiveDate: updatedAt ? updatedAt.toISOString().replace('T', ' ').slice(0, 19) : '',
        hasOrder: hasOrder ? 'Yes' : 'No',
        orderCount: orders.length,
        hasCart: hasCart ? 'Yes' : 'No',
        cartItemCount: hasCart ? d.activeCart.length : 0,
        cartTotalValue: cartTotal,
        cartItemsSummary,
        category,
        isServiceable: (addrLat && addrLng) ? (isServiceable ? 'Yes' : 'No') : 'No Coordinates',
        address: primaryAddr,
        callingAction
      };

      allCohort.push(record);
      if (hasCart && !hasOrder) {
        abandonedCartUsers.push(record);
      }
    }
  });

  // Sort abandoned cart users: HIGH PRIORITY serviceable first, then descending cart value
  abandonedCartUsers.sort((a, b) => {
    const aIsHot = a.category.includes('HIGH PRIORITY');
    const bIsHot = b.category.includes('HIGH PRIORITY');
    if (aIsHot && !bIsHot) return -1;
    if (!aIsHot && bIsHot) return 1;
    return b.cartTotalValue - a.cartTotalValue;
  });

  console.log('Generated ' + abandonedCartUsers.length + ' abandoned cart records.');
  console.log('Generated ' + allCohort.length + ' total cohort records.');

  // Write CSV for Abandoned Carts
  const csvHeaders = [
    'Customer Name',
    'Phone Number',
    'Category / Priority',
    'Cart Value (INR)',
    'Cart Items Details',
    'Is Location Serviceable?',
    'Customer Address',
    'Recommended Calling Script / Action',
    'Registered Date',
    'Last Active Date',
    'Email',
    'User ID'
  ];

  const abandonedCsvRows = [csvHeaders.join(',')];
  abandonedCartUsers.forEach(r => {
    abandonedCsvRows.push([
      escapeCsv(r.name),
      escapeCsv(r.phone),
      escapeCsv(r.category),
      r.cartTotalValue,
      escapeCsv(r.cartItemsSummary),
      escapeCsv(r.isServiceable),
      escapeCsv(r.address),
      escapeCsv(r.callingAction),
      escapeCsv(r.registeredDate),
      escapeCsv(r.lastActiveDate),
      escapeCsv(r.email),
      escapeCsv(r.userId)
    ].join(','));
  });

  const abandonedCsvPath = path.join(__dirname, '../abandoned_carts_calling_list.csv');
  fs.writeFileSync(abandonedCsvPath, abandonedCsvRows.join('\n'));
  console.log('Saved CSV to: ' + abandonedCsvPath);

  // Write CSV for Full Cohort
  const fullCsvHeaders = [
    'Customer Name',
    'Phone Number',
    'Category / Funnel Status',
    'Has Placed Order?',
    'Total Orders Placed',
    'Has Items In Cart?',
    'Cart Total Value (INR)',
    'Cart Items Details',
    'Is Location Serviceable?',
    'Customer Address',
    'Recommended Calling Script / Action',
    'Registered Date',
    'Last Active Date',
    'Email',
    'User ID'
  ];

  const fullCsvRows = [fullCsvHeaders.join(',')];
  allCohort.sort((a, b) => {
    if (a.hasOrder === 'Yes' && b.hasOrder !== 'Yes') return -1;
    if (a.hasOrder !== 'Yes' && b.hasOrder === 'Yes') return 1;
    return b.cartTotalValue - a.cartTotalValue;
  });

  allCohort.forEach(r => {
    fullCsvRows.push([
      escapeCsv(r.name),
      escapeCsv(r.phone),
      escapeCsv(r.category),
      escapeCsv(r.hasOrder),
      r.orderCount,
      escapeCsv(r.hasCart),
      r.cartTotalValue,
      escapeCsv(r.cartItemsSummary),
      escapeCsv(r.isServiceable),
      escapeCsv(r.address),
      escapeCsv(r.callingAction),
      escapeCsv(r.registeredDate),
      escapeCsv(r.lastActiveDate),
      escapeCsv(r.email),
      escapeCsv(r.userId)
    ].join(','));
  });

  const fullCsvPath = path.join(__dirname, '../onboarded_cohort_full_funnel.csv');
  fs.writeFileSync(fullCsvPath, fullCsvRows.join('\n'));
  console.log('Saved Full Cohort CSV to: ' + fullCsvPath);
}

runExport().catch(console.error);
