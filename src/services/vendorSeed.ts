// Vendor seed data for BTM and JP Nagar, Bangalore
// Based on real laundry services found in these areas

import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface VendorData {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: string; // 'BTM' or 'JP Nagar'
  rating: number;
  totalRatings: number;
  imageUrl: string;
  active: boolean;
  services: {
    id: string;
    name: string;
    description: string;
    pricePerUnit: number;
    unit: string;
    available: boolean;
  }[];
  timings: {
    open: string;
    close: string;
  };
  deliveryTime: string; // e.g., "2-3 hours"
  minOrder: number;
}

export const VENDOR_SEED_DATA: VendorData[] = [
  // BTM Area Vendors (Real vendors from web search)
  {
    id: 'vendor_btm_1',
    name: 'The Fairy Land Fabricare',
    phone: '+919876543210',
    address: 'BTM Layout, 2nd Stage, Bangalore - 560068',
    area: 'BTM',
    rating: 5.0,
    totalRatings: 312,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 50,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 100,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 200,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 150,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 300,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 150,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '08:00',
      close: '20:00',
    },
    deliveryTime: '48 hours',
    minOrder: 100,
  },
  {
    id: 'vendor_btm_2',
    name: 'LAUNDRY LOUNGE',
    phone: '+919876543211',
    address: 'BTM Layout, 1st Stage, Bangalore - 560068',
    area: 'BTM',
    rating: 5.0,
    totalRatings: 445,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 55,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 105,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 220,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 160,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 320,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 160,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '07:00',
      close: '21:00',
    },
    deliveryTime: '24 hours',
    minOrder: 120,
  },
  {
    id: 'vendor_btm_3',
    name: 'New Laundry Basket',
    phone: '+919876543212',
    address: 'BTM Layout, 2nd Stage, Bangalore - 560068',
    area: 'BTM',
    rating: 5.0,
    totalRatings: 278,
    imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 48,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 98,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 190,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 145,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 290,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 145,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '08:00',
      close: '20:00',
    },
    deliveryTime: '48 hours',
    minOrder: 100,
  },
  {
    id: 'vendor_btm_4',
    name: 'Wash n Wear',
    phone: '+919243080984',
    address: '22, Ground Floor, 7th Cross, 1st A Main Rd, BTM 2nd Stage, Bangalore - 560076',
    area: 'BTM',
    rating: 4.4,
    totalRatings: 476,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 52,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 102,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 210,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 155,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 310,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 155,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '09:00',
      close: '19:00',
    },
    deliveryTime: '1 hour',
    minOrder: 150,
  },
  // JP Nagar Area Vendors (Real vendors from web search)
  {
    id: 'vendor_jpnagar_1',
    name: 'Insta Laundromat',
    phone: '+919632391003',
    address: '1465, 6th Main Rd, East End Circle, 3rd Phase, JP Nagar, Bangalore - 560041',
    area: 'JP Nagar',
    rating: 4.6,
    totalRatings: 389,
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 60,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 110,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 250,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 170,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 330,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 170,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '08:00',
      close: '20:00',
    },
    deliveryTime: '2-3 hours',
    minOrder: 150,
  },
  {
    id: 'vendor_jpnagar_2',
    name: 'Laundry Nest',
    phone: '+919632220020',
    address: 'No. 1738, 9th Cross, KSRTC Layout, JP Nagar 2nd Phase, Bangalore - 560078',
    area: 'JP Nagar',
    rating: 4.5,
    totalRatings: 267,
    imageUrl: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 55,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 100,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 230,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 165,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 325,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 165,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '07:00',
      close: '21:00',
    },
    deliveryTime: '3-4 hours',
    minOrder: 120,
  },
  {
    id: 'vendor_jpnagar_3',
    name: 'LaundroKart',
    phone: '+918098570025',
    address: '#26, 1st Cross Road, Sai-Enclave Layout, JP Nagar 7th Phase, Bangalore - 560076',
    area: 'JP Nagar',
    rating: 4.7,
    totalRatings: 523,
    imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 58,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 108,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 240,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 168,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 328,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 168,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '08:00',
      close: '20:00',
    },
    deliveryTime: '2-3 hours',
    minOrder: 150,
  },
  {
    id: 'vendor_jpnagar_4',
    name: 'Ziptap Laundry',
    phone: '+917204407562',
    address: 'No-6, 1st Floor, Hiremath Arcade, Chunchaghatta Main Road, JP Nagar 7th Phase, Bangalore - 560076',
    area: 'JP Nagar',
    rating: 4.5,
    totalRatings: 312,
    imageUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400',
    active: true,
    services: [
      {
        id: 'wash_fold',
        name: 'Wash & Fold',
        description: 'Regular wash and fold service',
        pricePerUnit: 52,
        unit: 'kg',
        available: true,
      },
      {
        id: 'wash_iron',
        name: 'Wash & Iron',
        description: 'Wash, dry, and iron service',
        pricePerUnit: 102,
        unit: 'kg',
        available: true,
      },
      {
        id: 'blanket_wash',
        name: 'Blanket Wash',
        description: 'Professional blanket cleaning',
        pricePerUnit: 210,
        unit: 'piece',
        available: true,
      },
      {
        id: 'shoe_clean',
        name: 'Shoe Cleaning',
        description: 'Professional shoe cleaning service',
        pricePerUnit: 155,
        unit: 'piece',
        available: true,
      },
      {
        id: 'dry_clean',
        name: 'Dry Cleaning',
        description: 'Premium dry cleaning service',
        pricePerUnit: 310,
        unit: 'piece',
        available: true,
      },
      {
        id: 'premium_laundry',
        name: 'Premium Laundry',
        description: 'Premium care for delicate and high-end garments',
        pricePerUnit: 155,
        unit: 'kg',
        available: true,
      },
    ],
    timings: {
      open: '09:00',
      close: '19:00',
    },
    deliveryTime: '3-4 hours',
    minOrder: 100,
  },
];

// Function to seed vendors to Firestore
export const seedVendors = async () => {
  try {
    console.log('🌱 Starting vendor seed...');
    
    for (const vendor of VENDOR_SEED_DATA) {
      // Create vendor document
      const vendorRef = doc(db, 'vendors', vendor.id);
      await setDoc(vendorRef, {
        name: vendor.name,
        phone: vendor.phone,
        address: vendor.address,
        area: vendor.area,
        rating: vendor.rating,
        totalRatings: vendor.totalRatings,
        imageUrl: vendor.imageUrl,
        active: vendor.active,
        timings: vendor.timings,
        deliveryTime: vendor.deliveryTime,
        minOrder: vendor.minOrder,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Create services subcollection
      for (const service of vendor.services) {
        const serviceRef = doc(db, 'vendors', vendor.id, 'services', service.id);
        await setDoc(serviceRef, {
          name: service.name,
          description: service.description,
          pricePerUnit: service.pricePerUnit,
          unit: service.unit,
          available: service.available,
          createdAt: Timestamp.now(),
        });
      }

      console.log(`✅ Seeded vendor: ${vendor.name} (${vendor.id})`);
    }

    console.log('✅ All vendors seeded successfully!');
    return { success: true, count: VENDOR_SEED_DATA.length };
  } catch (error: any) {
    console.error('❌ Error seeding vendors:', error);
    throw error;
  }
};
