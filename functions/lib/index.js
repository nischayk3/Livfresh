"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrder = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const razorpay_1 = __importDefault(require("razorpay"));
admin.initializeApp();
// Initialize Razorpay with key credentials
// TODO: Use Firebase Secrets for production!
const razorpay = new razorpay_1.default({
    key_id: "rzp_test_S8DEqUtK5X23Bm", // Provided by user
    key_secret: "rEgaYnJ72J0GZsCoiMoyh0B8" // Provided by user
});
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
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
            keyId: "rzp_test_S8DEqUtK5X23Bm" // Send Key ID to frontend for init
        };
    }
    catch (error) {
        console.error("Error creating Razorpay order:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create order");
    }
});
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
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
        .createHmac("sha256", "rEgaYnJ72J0GZsCoiMoyh0B8") // Secret
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
                expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
                isActive: true
            });
        }
        else {
            // Handle monthly subscriptions if implemented later
        }
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        console.error("Error verifying payment/updating DB:", error);
        throw new functions.https.HttpsError("internal", "Payment verified but failed to update record.");
    }
});
//# sourceMappingURL=index.js.map