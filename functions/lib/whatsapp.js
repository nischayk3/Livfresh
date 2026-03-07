"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = exports.aisensyApiKey = void 0;
const params_1 = require("firebase-functions/params");
// Using native fetch in Node 18+ (which Firebase Functions now supports typically)
// If fetch is not available, we could use node-fetch or axios. We'll use native fetch.
exports.aisensyApiKey = (0, params_1.defineSecret)("AISENSY_API_KEY");
const AISENSY_BASE_URL = "https://backend.aisensy.com/campaign/t1/api/v2";
/**
 * Sends a WhatsApp message using the AiSensy API.
 *
 * @param params WhatsApp message parameters
 * @returns Response from AiSensy
 */
const sendWhatsAppMessage = async (params) => {
    const { phone, campaignName, parameters } = params;
    // Clean phone number: remove non-digits, ensure it starts with country code (assuming 91 for India if missing and 10 digits)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
    }
    const payload = {
        apiKey: exports.aisensyApiKey.value(),
        campaignName: campaignName,
        destination: cleanPhone,
        userName: "SpinZo User", // AiSensy requires this, but uses it internally or for fallback
        templateParams: parameters,
        source: "spinzo-backend",
    };
    try {
        const response = await fetch(AISENSY_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`AiSensy API Error (${response.status}):`, errorText);
            throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`WhatsApp campaign '${campaignName}' sent successfully to ${cleanPhone}.`, data);
        return data;
    }
    catch (error) {
        console.error("Error sending WhatsApp message:", error);
        // We don't necessarily want to crash the whole function if WhatsApp fails, 
        // but throwing an error allows the caller to decide.
        throw error;
    }
};
exports.sendWhatsAppMessage = sendWhatsAppMessage;
//# sourceMappingURL=whatsapp.js.map