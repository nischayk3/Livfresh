import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import Razorpay from "razorpay";
import { defineSecret } from "firebase-functions/params";
import { sendWhatsAppMessage, aisensyApiKey } from "./whatsapp";

admin.initializeApp();

const razorpayKeyId = defineSecret("RAZORPAY_LIVE_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_LIVE_KEY_SECRET");

// Initialize Razorpay with key credentials from secrets
// Note: Razorpay instance is creating inside the function to access secrets at runtime
// or use a factory if needed, but secrets are only available during execution.
// Actually, global scope secrets might not be resolved immediately. 
// Best practice: Access .value() inside the function.

interface CreateOrderRequest {
    amount: number; // in paise
    currency?: string;
}

export const createRazorpayOrder = functions.runWith({ secrets: [razorpayKeyId, razorpayKeySecret] }).https.onCall(async (data: CreateOrderRequest, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const razorpay = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value()
    });

    const { amount, currency = "INR" } = data;

    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "Amount must be greater than 0.");
    }

    try {
        const options = {
            amount: amount,
            currency: currency,
            receipt: `receipt_${Date.now()}_${context.auth.uid.substring(0, 5)}`,
            payment_capture: 1, // Auto capture
        };

        const order = await razorpay.orders.create(options);

        return {
            orderId: order.id,
            currency: order.currency,
            amount: order.amount,
            keyId: razorpayKeyId.value() // Send Key ID to frontend for init
        };

    } catch (error: any) {
        console.error("Error creating Razorpay order:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create order");
    }
});

interface VerifyPaymentRequest {
    orderId: string;
    paymentId: string;
    signature: string;
    planDetails: {
        type: 'single' | 'couple' | 'credits';
        credits?: number; // For credit packs
    };
}

export const verifyRazorpayPayment = functions.runWith({ secrets: [razorpayKeyId, razorpayKeySecret] }).https.onCall(async (data: VerifyPaymentRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { orderId, paymentId, signature, planDetails } = data;
    const userId = context.auth.uid;

    if (!orderId || !paymentId || !signature) {
        throw new functions.https.HttpsError("invalid-argument", "Missing payment details.");
    }

    // Verify Signature
    const crypto = require("crypto");
    const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret.value()) // Secret
        .update(orderId + "|" + paymentId)
        .digest("hex");

    if (generatedSignature !== signature) {
        throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
    }

    // Payment Verified - Update Firestore
    const db = admin.firestore();

    try {
        const batch = db.batch();

        // 1. Log Payment
        const paymentRef = db.collection("users").doc(userId).collection("payments").doc(paymentId);
        batch.set(paymentRef, {
            orderId,
            paymentId,
            amount: 0, // Ideally fetch from Razorpay API or pass safely, but relying on orderId association
            planDetails,
            status: "success",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Create Subscription / Add Credits
        if (planDetails.type === 'credits' && planDetails.credits) {
            // Update user credits
            const userRef = db.collection("users").doc(userId);
            // We use increment to be safe against concurrent updates
            batch.update(userRef, {
                credits: admin.firestore.FieldValue.increment(planDetails.credits),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create active subscription/credit pack log
            const subRef = db.collection("users").doc(userId).collection("subscriptions").doc();
            batch.set(subRef, {
                planType: 'credits',
                totalCredits: planDetails.credits,
                creditsUsed: 0,
                creditsRemaining: planDetails.credits,
                status: 'active',
                paymentId: paymentId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
                isActive: true
            });
        } else {
            // Handle monthly subscriptions if implemented later
        }

        await batch.commit();

        return { success: true };

    } catch (error: any) {
        console.error("Error verifying payment/updating DB:", error);
        throw new functions.https.HttpsError("internal", "Payment verified but failed to update record.");
    }
});

// ==========================================
// WHATSAPP AUTOMATION TRIGGERS
// ==========================================

export const onOrderCreatedWhatsApp = functions
    .runWith({ secrets: [aisensyApiKey] })
    .firestore.document("users/{userId}/orders/{orderId}")
    .onCreate(async (snap, context) => {
        const orderData = snap.data();
        const orderId = context.params.orderId;

        if (!orderData) return null;

        const phone = orderData.customerPhone || orderData.userPhone;
        const name = orderData.customerName || "Customer";
        const status = orderData.status;

        // Send confirmation message if order is in a freshly placed state
        // AND if phone number exists
        if ((status === 'confirmed' || status === 'placed') && phone) {
            try {
                await sendWhatsAppMessage({
                    phone,
                    campaignName: "SPINZO",
                    parameters: [name, orderId.toUpperCase().slice(-6)] // {{1}} = name, {{2}} = short order ID (last 6 chars)
                });
            } catch (err) {
                console.error("Failed to send WhatsApp order_placed notification:", err);
            }
        }

        return null;
    });

export const onOrderUpdatedWhatsApp = functions
    .runWith({ secrets: [aisensyApiKey] })
    .firestore.document("users/{userId}/orders/{orderId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const orderId = context.params.orderId;

        if (!beforeData || !afterData) return null;

        const phone = afterData.customerPhone || afterData.userPhone;
        const name = afterData.customerName || "Customer";

        const beforeStatus = beforeData.status;
        const afterStatus = afterData.status;

        // Only act if the status actually changed
        if (beforeStatus !== afterStatus && phone) {

            try {
                if (afterStatus === 'ready') {
                    // Admin marked clothes as ready for delivery scheduling
                    await sendWhatsAppMessage({
                        phone,
                        campaignName: "Spinzo Schedule Delivery",
                        parameters: [name, orderId.toUpperCase().slice(-6)]
                    });
                } else if (afterStatus === 'out_for_delivery') {
                    // Admin marked as out for delivery
                    await sendWhatsAppMessage({
                        phone,
                        campaignName: "Spinzo out of delivery",
                        parameters: [name, orderId.toUpperCase().slice(-6)]
                    });
                }
            } catch (err) {
                console.error(`Failed to send WhatsApp notification for status ${afterStatus}:`, err);
            }
        }

        return null;
    });

// ==========================================
// PUSH & IN-APP NOTIFICATION TRIGGERS
// ==========================================

import { sendPushNotification, createInAppNotification, sendBatchPushNotifications } from "./pushNotification";

export const onOrderCreatedNotification = functions.firestore
    .document("users/{userId}/orders/{orderId}")
    .onCreate(async (snap, context) => {
        const orderData = snap.data();
        const userId = context.params.userId;
        const orderId = context.params.orderId;

        if (!orderData) return null;

        try {
            // Fetch user profile to get token & preferences
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            const name = userData?.name || orderData.customerName || "Customer";
            const expoPushToken = userData?.expoPushToken;

            const pickupDate = orderData.pickupDate || orderData.pickup?.scheduledDate || '';
            const pickupTime = orderData.pickupTimeSlot || orderData.pickup?.scheduledTime || '';
            
            let body = "";
            if (pickupDate && pickupTime) {
                body = `Hey ${name}, your laundry pickup is scheduled for ${pickupDate}, ${pickupTime}. Keep your pickup OTP ready!`;
            } else {
                body = `Hey ${name}, your laundry pickup has been scheduled. Keep your pickup OTP ready!`;
            }

            const title = "🧺 Order Confirmed!";

            // 1. Create In-App Notification
            await createInAppNotification(userId, {
                type: "order_confirmed",
                title,
                body,
                data: {
                    orderId,
                    screen: "OrderDetail",
                }
            });

            // 2. Send Push Notification if token is registered
            if (expoPushToken) {
                await sendPushNotification(expoPushToken, {
                    title,
                    body,
                    data: {
                        orderId,
                        screen: "OrderDetail",
                    }
                });
            }
        } catch (error) {
            console.error("Error running onOrderCreatedNotification:", error);
        }

        return null;
    });

export const onOrderStatusChanged = functions.firestore
    .document("users/{userId}/orders/{orderId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const userId = context.params.userId;
        const orderId = context.params.orderId;

        if (!beforeData || !afterData) return null;

        const beforeStatus = beforeData.status;
        const afterStatus = afterData.status;

        // Only act if the status actually changed
        if (beforeStatus === afterStatus) return null;

        // Define valid statuses we notify for
        const notifyStatuses = ["pickup_completed", "ready", "out_for_delivery", "delivered", "cancelled"];
        if (!notifyStatuses.includes(afterStatus)) return null;

        try {
            // Fetch user profile to get token & preferences
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            const name = userData?.name || afterData.customerName || "Customer";
            const expoPushToken = userData?.expoPushToken;

            let title = "";
            let body = "";
            let data: Record<string, any> = {
                orderId,
                screen: "OrderDetail",
            };

            const shortId = orderId.toUpperCase().slice(-6);

            switch (afterStatus) {
                case "pickup_completed":
                    title = "✅ Clothes Picked Up!";
                    body = `We've got your clothes, ${name}! Token #${shortId}. They're heading to our care center now.`;
                    break;
                case "ready":
                    title = "👔 Your Clothes Are Ready!";
                    body = `Great news, ${name}! Your order #${shortId} is fresh and packed. Schedule your delivery slot now →`;
                    data.autoOpenScheduler = true;
                    break;
                case "out_for_delivery":
                    title = "🚚 On the Way!";
                    const otp = afterData.deliveryOTP || "";
                    body = `Your fresh clothes are on the way, ${name}! Keep your delivery OTP ${otp} ready.`;
                    break;
                case "delivered":
                    title = "🎉 Enjoy Your Fresh Clothes!";
                    body = `Your order #${shortId} has been delivered! Loved the experience? Leave us a quick review 💜`;
                    data.action = "open_review";
                    data.url = "https://maps.app.goo.gl/rVLw2y9vpjZecLFZ8";
                    break;
                case "cancelled":
                    title = "Order Cancelled";
                    const reason = afterData.cancelReason || "Cancelled by system";
                    body = `Your order #${shortId} has been cancelled. Reason: ${reason}. Need help? Reach out anytime.`;
                    break;
            }

            // 1. Create In-App Notification
            await createInAppNotification(userId, {
                type: afterStatus,
                title,
                body,
                data,
            });

            // 2. Send Push Notification if token is registered
            if (expoPushToken) {
                await sendPushNotification(expoPushToken, {
                    title,
                    body,
                    data,
                });
            }
        } catch (error) {
            console.error(`Error running onOrderStatusChanged for status ${afterStatus}:`, error);
        }

        return null;
    });

// ==========================================
// SCHEDULED NOTIFICATION CAMPAIGNS
// ==========================================

export const weeklyLaundryReminder = functions.pubsub
    .schedule("30 9 * * 4") // Thursday 9:30 AM IST
    .timeZone("Asia/Kolkata")
    .onRun(async (context) => {
        const db = admin.firestore();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        try {
            // 1. Get userIds of users who placed an order in the last 7 days
            const activeOrdersSnap = await db.collectionGroup("orders")
                .where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
                .get();

            const activeUserIds = new Set<string>();
            activeOrdersSnap.forEach((doc) => {
                const data = doc.data();
                if (data.userId) {
                    activeUserIds.add(data.userId);
                }
            });

            // 2. Query all users who have registered a push token
            const usersSnap = await db.collection("users")
                .where("expoPushToken", "!=", null)
                .get();

            const pushMessages: any[] = [];
            const batch = db.batch();
            let addedToBatch = false;

            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                
                // Skip users who have ordered in the last 7 days
                if (activeUserIds.has(userId)) continue;

                const userData = userDoc.data();
                const name = userData.name || "there";
                const expoPushToken = userData.expoPushToken;

                const title = "🧺 Weekend Laundry Sorted!";
                const body = `Hey ${name}, the weekend's here! Schedule a pickup and we'll handle the laundry while you relax 🛋️`;
                const data = { screen: "Home" };

                // Create in-app notification doc
                const notifRef = db.collection("users").doc(userId).collection("notifications").doc();
                batch.set(notifRef, {
                    type: "weekly_reminder",
                    title,
                    body,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    data,
                });
                addedToBatch = true;

                if (expoPushToken) {
                    pushMessages.push({
                        to: expoPushToken,
                        title,
                        body,
                        data,
                    });
                }
            }

            // Commit all in-app notifications
            if (addedToBatch) {
                await batch.commit();
            }

            // Send batch pushes
            if (pushMessages.length > 0) {
                await sendBatchPushNotifications(pushMessages);
            }

            console.log(`Weekly reminder campaign sent. Processed ${pushMessages.length} push messages.`);
        } catch (error) {
            console.error("Error executing weeklyLaundryReminder:", error);
        }

        return null;
    });

export const creditExpiryReminder = functions.pubsub
    .schedule("30 9 * * *") // Daily 9:30 AM IST
    .timeZone("Asia/Kolkata")
    .onRun(async (context) => {
        const db = admin.firestore();
        const now = new Date();
        
        // Expiring in exactly 3 days (between 2.5 and 3.5 days from now)
        const startRange = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);
        const endRange = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);

        try {
            const expiringSubsSnap = await db.collectionGroup("subscriptions")
                .where("status", "==", "active")
                .where("expiresAt", ">=", Timestamp.fromDate(startRange))
                .where("expiresAt", "<=", Timestamp.fromDate(endRange))
                .get();

            const pushMessages: any[] = [];
            const batch = db.batch();
            let addedToBatch = false;

            for (const subDoc of expiringSubsSnap.docs) {
                const subData = subDoc.data();
                const creditsRemaining = subData.creditsRemaining || 0;
                
                // Only remind if they actually have credits left to expire
                if (creditsRemaining <= 0) continue;

                // Parent user ID is doc.ref.parent.parent.id
                const userRef = subDoc.ref.parent.parent;
                if (!userRef) continue;
                const userId = userRef.id;

                const userSnap = await userRef.get();
                if (!userSnap.exists) continue;
                
                const userData = userSnap.data() || {};
                const expoPushToken = userData.expoPushToken;

                const title = "⚡ Credits Expiring Soon";
                const body = `You have ${creditsRemaining} SpinZo credits expiring in 3 days. Use them before they're gone!`;
                const data = { screen: "Credits" };

                // Create in-app notification doc
                const notifRef = db.collection("users").doc(userId).collection("notifications").doc();
                batch.set(notifRef, {
                    type: "credit_expiry",
                    title,
                    body,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    data,
                });
                addedToBatch = true;

                if (expoPushToken) {
                    pushMessages.push({
                        to: expoPushToken,
                        title,
                        body,
                        data,
                    });
                }
            }

            // Commit all in-app notifications
            if (addedToBatch) {
                await batch.commit();
            }

            // Send batch pushes
            if (pushMessages.length > 0) {
                await sendBatchPushNotifications(pushMessages);
            }

            console.log(`Credit expiry reminders sent: ${pushMessages.length}`);
        } catch (error) {
            console.error("Error executing creditExpiryReminder:", error);
        }

        return null;
    });

