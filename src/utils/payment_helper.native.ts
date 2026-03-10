export const openRazorpay = async (options: any): Promise<any> => {
    try {
        const RazorpayCheckout = (await import('react-native-razorpay')).default;
        return await RazorpayCheckout.open(options);
    } catch (error) {
        throw error;
    }
};
